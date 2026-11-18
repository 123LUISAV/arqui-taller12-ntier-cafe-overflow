import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearNegocio, ErrorNegocio, CODIGOS } from '../src/negocio/index.js';
import { crearDaosFalsos, PRODUCTOS_BASE, clienteBase } from './helpers/fakes.js';

function escenario(clienteExtra = {}) {
  const daos = crearDaosFalsos({ productos: PRODUCTOS_BASE, clientes: [clienteBase(clienteExtra)] });
  const negocio = crearNegocio({ ...daos, reloj: () => new Date('2026-11-01T10:00:00Z') });
  return { ...daos, negocio };
}

const rechaza = (fn, codigo) => assert.throws(fn, (e) => e instanceof ErrorNegocio && e.codigo === codigo);

test('Regla 1: el pedido de un cliente Mid recibe 10 % de descuento', () => {
  const { negocio } = escenario({ nivel: 'Mid' });
  const p = negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 2 }] });
  assert.equal(p.subtotal, 20000);
  assert.equal(p.descuentoNivel, 2000);
  assert.equal(p.total, 18000);
  assert.equal(p.estado, 'Pendiente de pago');
});

test('Regla 2: cliente nuevo nace Junior con acumulado $0', () => {
  const { negocio } = escenario();
  const c = negocio.clientes.registrar({ nombre: ' Nuevo Cliente ', correo: 'nuevo@ejemplo.com' });
  assert.equal(c.nivel, 'Junior');
  assert.equal(c.montoAcumulado, 0);
  assert.equal(c.devPoints, 0);
  assert.equal(c.nombre, 'Nuevo Cliente');
});

test('Regla 2: correo duplicado se rechaza', () => {
  const { negocio } = escenario();
  rechaza(() => negocio.clientes.registrar({ nombre: 'Otra', correo: 'PRUEBA@ejemplo.com' }), CODIGOS.CORREO_DUPLICADO);
});

test('Regla 2: asciende a Mid al completar compras que alcanzan $500.000', () => {
  const { negocio, clienteDao } = escenario({ montoAcumulado: 480_000 });
  const p = negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 3 }] }); // 30000 - 5 % = 28500
  assert.equal(p.total, 28500);
  negocio.pedidos.avanzarEstado(p.id); // En Preparación
  negocio.pedidos.avanzarEstado(p.id); // Listo
  assert.equal(clienteDao.obtener(1).nivel, 'Junior'); // aún no está completada
  const { recompensa } = negocio.pedidos.avanzarEstado(p.id); // Entregado
  const c = clienteDao.obtener(1);
  assert.equal(c.montoAcumulado, 508_500);
  assert.equal(c.nivel, 'Mid');
  assert.equal(recompensa.ascendio, true);
  assert.equal(recompensa.nivelNuevo, 'Mid');
});

test('Regla 2: asciende a Senior al llegar a $1.500.000', () => {
  const { negocio, clienteDao } = escenario({ nivel: 'Mid', montoAcumulado: 1_490_000 });
  const p = negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 2 }] }); // 18000
  for (let i = 0; i < 3; i += 1) negocio.pedidos.avanzarEstado(p.id);
  assert.equal(clienteDao.obtener(1).nivel, 'Senior');
});

test('Regla 3: al entregar se otorga 1 DevPoint por cada $20.000 pagados', () => {
  const { negocio, clienteDao } = escenario({ nivel: 'Senior' });
  const p = negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 5 }] }); // 50000 - 15 % = 42500
  assert.equal(p.total, 42500);
  for (let i = 0; i < 3; i += 1) negocio.pedidos.avanzarEstado(p.id);
  assert.equal(clienteDao.obtener(1).devPoints, 2);
});

test('Regla 3: redimir DevPoints descuenta $200 c/u y descuenta el saldo del cliente', () => {
  const { negocio, clienteDao } = escenario({ devPoints: 10 });
  const p = negocio.pedidos.registrar({
    clienteId: 1, items: [{ productoId: 1, cantidad: 2 }], devPointsARedimir: 4,
  }); // 20000 - 1000 (5 %) - 800
  assert.equal(p.descuentoDevPoints, 800);
  assert.equal(p.devPointsRedimidos, 4);
  assert.equal(p.total, 18200);
  assert.equal(clienteDao.obtener(1).devPoints, 6);
});

test('Regla 3: no se pueden redimir más DevPoints que el saldo', () => {
  const { negocio, clienteDao } = escenario({ devPoints: 3 });
  const p = negocio.pedidos.registrar({
    clienteId: 1, items: [{ productoId: 1, cantidad: 1 }], devPointsARedimir: 99,
  });
  assert.equal(p.devPointsRedimidos, 3);
  assert.equal(clienteDao.obtener(1).devPoints, 0);
});

test('Regla 4a: no registra si la cantidad supera el stock', () => {
  const { negocio, pedidoDao } = escenario();
  rechaza(() => negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 2, cantidad: 4 }] }), CODIGOS.STOCK_INSUFICIENTE);
  assert.equal(pedidoDao.listar().length, 0);
});

test('Regla 4a: la suma de líneas repetidas también se compara con el stock', () => {
  const { negocio } = escenario();
  rechaza(() => negocio.pedidos.registrar({
    clienteId: 1, items: [{ productoId: 2, cantidad: 2 }, { productoId: 2, cantidad: 2 }],
  }), CODIGOS.STOCK_INSUFICIENTE);
});

test('Regla 4a: cantidad igual al stock sí se permite y el stock queda en 0', () => {
  const { negocio, productoDao } = escenario();
  negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 2, cantidad: 3 }] });
  assert.equal(productoDao.obtener(2).stock, 0);
});

test('Regla 4b: no registra un pedido nuevo si hay uno Pendiente de pago', () => {
  const { negocio, productoDao } = escenario();
  negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 1 }] });
  rechaza(() => negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 1 }] }), CODIGOS.PEDIDO_PENDIENTE);
  assert.equal(productoDao.obtener(1).stock, 9);
});

test('Regla 4b: tras pagar (En Preparación) el cliente puede hacer otro pedido', () => {
  const { negocio } = escenario();
  const p = negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 1 }] });
  negocio.pedidos.avanzarEstado(p.id);
  const p2 = negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 1 }] });
  assert.equal(p2.estado, 'Pendiente de pago');
});

test('Flujo de estados: avanza en orden y no pasa de Entregado', () => {
  const { negocio } = escenario();
  const p = negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 1 }] });
  const estados = [1, 2, 3].map(() => negocio.pedidos.avanzarEstado(p.id).pedido.estado);
  assert.deepEqual(estados, ['En Preparación', 'Listo', 'Entregado']);
  rechaza(() => negocio.pedidos.avanzarEstado(p.id), CODIGOS.ESTADO_FINAL);
});

test('Solo el estado Entregado suma al acumulado (no se suma dos veces)', () => {
  const { negocio, clienteDao } = escenario();
  const p = negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 2 }] });
  negocio.pedidos.avanzarEstado(p.id);
  assert.equal(clienteDao.obtener(1).montoAcumulado, 0);
  negocio.pedidos.avanzarEstado(p.id);
  negocio.pedidos.avanzarEstado(p.id);
  assert.equal(clienteDao.obtener(1).montoAcumulado, 19000);
});

test('Validaciones de dominio: cantidad, pedido vacío y entidades inexistentes', () => {
  const { negocio } = escenario();
  rechaza(() => negocio.pedidos.registrar({ clienteId: 1, items: [] }), CODIGOS.DATOS_INVALIDOS);
  rechaza(() => negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 1, cantidad: 0 }] }), CODIGOS.DATOS_INVALIDOS);
  rechaza(() => negocio.pedidos.registrar({ clienteId: 99, items: [{ productoId: 1, cantidad: 1 }] }), CODIGOS.NO_ENCONTRADO);
  rechaza(() => negocio.pedidos.registrar({ clienteId: 1, items: [{ productoId: 99, cantidad: 1 }] }), CODIGOS.NO_ENCONTRADO);
});

test('Cotizar calcula sin guardar ni tocar el stock', () => {
  const { negocio, pedidoDao, productoDao } = escenario({ nivel: 'Senior', devPoints: 5 });
  const q = negocio.pedidos.cotizar({ clienteId: 1, items: [{ productoId: 1, cantidad: 2 }], devPointsARedimir: 5 });
  assert.equal(q.total, 20000 - 3000 - 1000);
  assert.equal(pedidoDao.listar().length, 0);
  assert.equal(productoDao.obtener(1).stock, 10);
});

test('Perfil del cliente incluye descuento, progreso e historial', () => {
  const { negocio } = escenario({ montoAcumulado: 250_000 });
  const perfil = negocio.clientes.perfil(1);
  assert.equal(perfil.descuentoActual, 5);
  assert.equal(perfil.progreso.siguienteNivel, 'Mid');
  assert.equal(perfil.progreso.porcentaje, 50);
});

test('Gestión de menú: crear producto válido y rechazar inválidos o duplicados', () => {
  const { negocio } = escenario();
  const p = negocio.productos.crear({ nombre: 'Matcha Merge', precioBase: 9000, stock: 12 });
  assert.equal(p.nombre, 'Matcha Merge');
  rechaza(() => negocio.productos.crear({ nombre: 'matcha merge', precioBase: 9000, stock: 1 }), CODIGOS.PRODUCTO_DUPLICADO);
  rechaza(() => negocio.productos.crear({ nombre: 'X', precioBase: -5, stock: 1 }), CODIGOS.DATOS_INVALIDOS);
});
