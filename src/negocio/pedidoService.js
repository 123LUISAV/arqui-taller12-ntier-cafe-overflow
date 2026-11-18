import { ErrorNegocio, CODIGOS } from './errores.js';
import {
  ESTADOS, calcularTotales, devPointsGanados, nivelResultante, siguienteEstado,
} from './reglas.js';

export class PedidoService {
  /**
   * @param {object} deps
   * @param {object} deps.productoDao @param {object} deps.clienteDao @param {object} deps.pedidoDao
   * @param {(fn: Function) => any} deps.transaccion ejecuta fn de forma atómica
   * @param {() => Date} [deps.reloj] fuente de la fecha (inyectable para pruebas)
   */
  constructor({ productoDao, clienteDao, pedidoDao, transaccion = (fn) => fn(), reloj = () => new Date() }) {
    this.productoDao = productoDao;
    this.clienteDao = clienteDao;
    this.pedidoDao = pedidoDao;
    this.transaccion = transaccion;
    this.reloj = reloj;
  }

  listar() {
    return this.pedidoDao.listar().map((p) => this.#conCliente(p));
  }

  obtener(id) {
    const p = this.pedidoDao.obtener(id);
    if (!p) throw new ErrorNegocio(CODIGOS.NO_ENCONTRADO, `No existe el pedido ${id}.`);
    return this.#conCliente(p);
  }

  /** Calcula (sin guardar) cuánto costaría el pedido. Valida ítems y stock. */
  cotizar({ clienteId, items, devPointsARedimir = 0 }) {
    const cliente = this.#clienteExistente(clienteId);
    const lineas = this.#prepararLineas(items);
    return { ...this.#totales(lineas, cliente, devPointsARedimir), items: lineas };
  }

  /** Registra un pedido aplicando las reglas 1, 3 y 4. */
  registrar({ clienteId, items, devPointsARedimir = 0 }) {
    return this.transaccion(() => {
      const cliente = this.#clienteExistente(clienteId);

      // Regla 4b: no se permite un nuevo pedido si hay otro Pendiente de pago.
      if (this.pedidoDao.buscarPorClienteYEstado(cliente.id, ESTADOS.PENDIENTE_PAGO)) {
        throw new ErrorNegocio(
          CODIGOS.PEDIDO_PENDIENTE,
          'El cliente ya tiene un pedido pendiente de pago. Debe pagarlo antes de crear otro.'
        );
      }

      const lineas = this.#prepararLineas(items); // incluye la regla 4a (stock)
      const totales = this.#totales(lineas, cliente, devPointsARedimir);

      const pedido = this.pedidoDao.crear({
        clienteId: cliente.id,
        estado: ESTADOS.PENDIENTE_PAGO,
        ...totales,
        fecha: this.reloj().toISOString(),
        items: lineas.map(({ productoId, nombre, precioUnitario, cantidad }) => (
          { productoId, nombre, precioUnitario, cantidad }
        )),
      });

      // El stock se descuenta al registrar para reservar los productos.
      for (const l of lineas) this.productoDao.actualizarStock(l.productoId, l.stockDisponible - l.cantidad);

      // Los DevPoints redimidos salen del saldo del cliente.
      if (totales.devPointsRedimidos > 0) {
        this.clienteDao.actualizar({ ...cliente, devPoints: cliente.devPoints - totales.devPointsRedimidos });
      }
      return this.#conCliente(pedido);
    });
  }

  /**
   * Avanza el pedido al siguiente estado (solo hacia adelante). Al pasar a Entregado se
   * considera compra completada: suma al acumulado, otorga DevPoints (regla 3) y
   * evalúa el ascenso de nivel (regla 2).
   */
  avanzarEstado(id) {
    return this.transaccion(() => {
      const actual = this.pedidoDao.obtener(id);
      if (!actual) throw new ErrorNegocio(CODIGOS.NO_ENCONTRADO, `No existe el pedido ${id}.`);
      const nuevo = siguienteEstado(actual.estado);
      if (!nuevo) throw new ErrorNegocio(CODIGOS.ESTADO_FINAL, 'El pedido ya fue entregado; no admite más cambios.');

      const pedido = this.pedidoDao.actualizarEstado(id, nuevo);
      let recompensa = null;
      if (nuevo === ESTADOS.ENTREGADO) {
        const cliente = this.clienteDao.obtener(pedido.clienteId);
        const montoAcumulado = cliente.montoAcumulado + pedido.total;
        const ganados = devPointsGanados(pedido.total);
        const nivel = nivelResultante(cliente.nivel, montoAcumulado);
        this.clienteDao.actualizar({
          ...cliente, montoAcumulado, devPoints: cliente.devPoints + ganados, nivel,
        });
        recompensa = {
          devPointsGanados: ganados, nivelAnterior: cliente.nivel, nivelNuevo: nivel,
          ascendio: nivel !== cliente.nivel,
        };
      }
      return { pedido: this.#conCliente(pedido), recompensa };
    });
  }

  // --- internos ---

  #clienteExistente(clienteId) {
    const c = this.clienteDao.obtener(clienteId);
    if (!c) throw new ErrorNegocio(CODIGOS.NO_ENCONTRADO, 'El cliente indicado no existe.');
    return c;
  }

  #totales(lineas, cliente, devPointsARedimir) {
    return calcularTotales({
      items: lineas, nivel: cliente.nivel,
      devPointsSolicitados: devPointsARedimir, saldoDevPoints: cliente.devPoints,
    });
  }

  /** Une ítems repetidos, valida cantidades y existencias (regla 4a). */
  #prepararLineas(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorNegocio(CODIGOS.DATOS_INVALIDOS, 'El pedido debe tener al menos un producto.');
    }
    const acumulado = new Map();
    for (const it of items) {
      if (!Number.isInteger(it.cantidad) || it.cantidad <= 0) {
        throw new ErrorNegocio(CODIGOS.DATOS_INVALIDOS, 'La cantidad de cada producto debe ser un entero mayor que cero.');
      }
      acumulado.set(it.productoId, (acumulado.get(it.productoId) ?? 0) + it.cantidad);
    }
    return [...acumulado].map(([productoId, cantidad]) => {
      const producto = this.productoDao.obtener(productoId);
      if (!producto) throw new ErrorNegocio(CODIGOS.NO_ENCONTRADO, `No existe el producto ${productoId}.`);
      if (cantidad > producto.stock) {
        throw new ErrorNegocio(
          CODIGOS.STOCK_INSUFICIENTE,
          `Stock insuficiente de "${producto.nombre}": pediste ${cantidad} y solo hay ${producto.stock}.`
        );
      }
      return {
        productoId, nombre: producto.nombre, precioUnitario: producto.precioBase,
        cantidad, stockDisponible: producto.stock,
      };
    });
  }

  #conCliente(pedido) {
    const cliente = this.clienteDao.obtener(pedido.clienteId);
    return { ...pedido, clienteNombre: cliente ? cliente.nombre : '(desconocido)' };
  }
}
