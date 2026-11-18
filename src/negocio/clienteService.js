import { ErrorNegocio, CODIGOS } from './errores.js';
import { NIVELES, porcentajeDescuento, progresoSiguienteNivel } from './reglas.js';

export class ClienteService {
  constructor({ clienteDao, pedidoDao }) {
    this.clienteDao = clienteDao;
    this.pedidoDao = pedidoDao;
  }

  listar() {
    return this.clienteDao.listar();
  }

  obtener(id) {
    const c = this.clienteDao.obtener(id);
    if (!c) throw new ErrorNegocio(CODIGOS.NO_ENCONTRADO, `No existe el cliente ${id}.`);
    return c;
  }

  /** Regla 2: todo cliente nuevo nace Junior con acumulado en $0. */
  registrar({ nombre, correo }) {
    if (typeof nombre !== 'string' || nombre.trim() === '' || typeof correo !== 'string' || correo.trim() === '') {
      throw new ErrorNegocio(CODIGOS.DATOS_INVALIDOS, 'El nombre y el correo son obligatorios.');
    }
    if (this.clienteDao.obtenerPorCorreo(correo.trim())) {
      throw new ErrorNegocio(CODIGOS.CORREO_DUPLICADO, 'Ya hay un cliente registrado con ese correo.');
    }
    return this.clienteDao.crear({
      nombre: nombre.trim(), correo: correo.trim(),
      nivel: NIVELES.JUNIOR, devPoints: 0, montoAcumulado: 0,
    });
  }

  /** Perfil: datos del cliente, descuento vigente, progreso al siguiente nivel y su historial. */
  perfil(id) {
    const cliente = this.obtener(id);
    return {
      cliente,
      descuentoActual: porcentajeDescuento(cliente.nivel),
      progreso: progresoSiguienteNivel(cliente.nivel, cliente.montoAcumulado),
      pedidos: this.pedidoDao.listarPorCliente(id),
    };
  }
}
