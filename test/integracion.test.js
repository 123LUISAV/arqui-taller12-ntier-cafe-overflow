import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearPersistencia } from '../src/persistencia/index.js';
import { crearNegocio, ErrorNegocio, CODIGOS } from '../src/negocio/index.js';

// Integración Negocio + Persistencia real (SQLite en memoria con los datos semilla).
function arrancar() {
  const per = crearPersistencia({ ruta: ':memory:', sembrar: true });
  return { per, negocio: crearNegocio(per) };
}

test('Integración: el seed carga productos y clientes', () => {
  const { per, negocio } = arrancar();
  assert.equal(negocio.productos.listar().length, 8);
  assert.equal(negocio.clientes.listar().length, 3);
  per.cerrar();
});

test('Integración: ciclo completo de un pedido con redención, entrega, DevPoints y ascenso', () => {
  const { per, negocio } = arrancar();
  const [, andres] = negocio.clientes.listar(); // Mid, 650.000 acumulado, 20 DevPoints
  const combo = negocio.productos.listar().find((p) => p.nombre === 'Combo BugHunter');

  const pedido = negocio.pedidos.registrar({
    clienteId: andres.id, items: [{ productoId: combo.id, cantidad: 6 }], devPointsARedimir: 10,
  }); // 108000 - 10 % = 97200 - 2000 = 95200
  assert.equal(pedido.subtotal, 108000);
  assert.equal(pedido.descuentoNivel, 10800);
  assert.equal(pedido.descuentoDevPoints, 2000);
  assert.equal(pedido.total, 95200);
  assert.equal(negocio.productos.obtener(combo.id).stock, 34);
  assert.equal(negocio.clientes.obtener(andres.id).devPoints, 10);

  for (let i = 0; i < 3; i += 1) negocio.pedidos.avanzarEstado(pedido.id);

  const despues = negocio.clientes.obtener(andres.id);
  assert.equal(despues.montoAcumulado, 650_000 + 95_200);
  assert.equal(despues.devPoints, 10 + 4); // floor(95200 / 20000) = 4
  assert.equal(despues.nivel, 'Mid');
  assert.equal(negocio.pedidos.obtener(pedido.id).estado, 'Entregado');
  assert.equal(negocio.pedidos.obtener(pedido.id).items[0].nombre, 'Combo BugHunter');
  per.cerrar();
});

test('Integración: reglas 4a y 4b con la base real', () => {
  const { per, negocio } = arrancar();
  const camila = negocio.clientes.listar()[0];
  const sandwich = negocio.productos.listar().find((p) => p.nombre === 'Sándwich Full Stack'); // stock 5
  assert.throws(
    () => negocio.pedidos.registrar({ clienteId: camila.id, items: [{ productoId: sandwich.id, cantidad: 6 }] }),
    (e) => e instanceof ErrorNegocio && e.codigo === CODIGOS.STOCK_INSUFICIENTE
  );
  negocio.pedidos.registrar({ clienteId: camila.id, items: [{ productoId: sandwich.id, cantidad: 1 }] });
  assert.throws(
    () => negocio.pedidos.registrar({ clienteId: camila.id, items: [{ productoId: sandwich.id, cantidad: 1 }] }),
    (e) => e instanceof ErrorNegocio && e.codigo === CODIGOS.PEDIDO_PENDIENTE
  );
  per.cerrar();
});

test('Integración: la transacción revierte todo si algo falla a mitad del registro', () => {
  const { per, negocio } = arrancar();
  const camila = negocio.clientes.listar()[0];
  const [espresso] = negocio.productos.listar();
  const original = per.productoDao.actualizarStock;
  per.productoDao.actualizarStock = () => { throw new Error('fallo simulado'); };
  assert.throws(() => negocio.pedidos.registrar({
    clienteId: camila.id, items: [{ productoId: espresso.id, cantidad: 2 }],
  }), /fallo simulado/);
  per.productoDao.actualizarStock = original;
  assert.equal(negocio.pedidos.listar().length, 0); // el pedido insertado se revirtió
  assert.equal(negocio.productos.obtener(espresso.id).stock, 60);
  per.cerrar();
});
