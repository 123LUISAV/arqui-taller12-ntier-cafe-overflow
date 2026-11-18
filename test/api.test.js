import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../src/app.js';

// Pruebas de extremo a extremo de las tres capas a través de HTTP (SQLite en memoria).
let app; let base;
before(async () => {
  app = crearApp({ rutaBaseDatos: ':memory:' });
  await new Promise((r) => app.servidor.listen(0, r));
  base = `http://localhost:${app.servidor.address().port}`;
});
after(() => app.cerrar());

const pedir = async (ruta, metodo = 'GET', cuerpo) => {
  const res = await fetch(base + ruta, {
    method: metodo, headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { estado: res.status, datos: await res.json() };
};

test('GET /api/productos devuelve el menú semilla', async () => {
  const { estado, datos } = await pedir('/api/productos');
  assert.equal(estado, 200);
  assert.equal(datos.length, 8);
});

test('La Presentación rechaza correos mal formados (validación sintáctica)', async () => {
  const r = await pedir('/api/clientes', 'POST', { nombre: 'Ana', correo: 'no-es-correo' });
  assert.equal(r.estado, 400);
  const vacio = await pedir('/api/clientes', 'POST', { nombre: '', correo: 'a@b.co' });
  assert.equal(vacio.estado, 400);
});

test('Registro de cliente nuevo: Junior con acumulado 0', async () => {
  const { estado, datos } = await pedir('/api/clientes', 'POST', { nombre: 'Ana Test', correo: 'ana.test@ejemplo.com' });
  assert.equal(estado, 201);
  assert.equal(datos.nivel, 'Junior');
  assert.equal(datos.montoAcumulado, 0);
});

test('Errores de negocio llegan como 409/422 con mensaje legible', async () => {
  const [camila] = (await pedir('/api/clientes')).datos;
  const sand = (await pedir('/api/productos')).datos.find((p) => p.nombre.startsWith('Sándwich'));
  const stock = await pedir('/api/pedidos', 'POST', { clienteId: camila.id, items: [{ productoId: sand.id, cantidad: 99 }] });
  assert.equal(stock.estado, 422);
  assert.match(stock.datos.error, /Stock insuficiente/);

  const ok = await pedir('/api/pedidos', 'POST', { clienteId: camila.id, items: [{ productoId: sand.id, cantidad: 1 }] });
  assert.equal(ok.estado, 201);
  assert.equal(ok.datos.total, 14725); // 15500 - 5 %
  const dup = await pedir('/api/pedidos', 'POST', { clienteId: camila.id, items: [{ productoId: sand.id, cantidad: 1 }] });
  assert.equal(dup.estado, 409);
  assert.equal(dup.datos.codigo, 'PEDIDO_PENDIENTE_DE_PAGO');
});

test('Avanzar estado y perfil actualizado', async () => {
  const pedidos = (await pedir('/api/pedidos')).datos;
  const pedido = pedidos[0];
  assert.equal(pedido.siguienteEstado, 'En Preparación');
  for (let i = 0; i < 3; i += 1) await pedir(`/api/pedidos/${pedido.id}/avanzar`, 'POST', {});
  const fin = await pedir(`/api/pedidos/${pedido.id}/avanzar`, 'POST', {});
  assert.equal(fin.estado, 409);
  const perfil = (await pedir(`/api/clientes/${pedido.clienteId}`)).datos;
  assert.equal(perfil.cliente.montoAcumulado, 14725);
  assert.equal(perfil.progreso.siguienteNivel, 'Mid');
});

test('Rutas inexistentes y bloqueo de path traversal', async () => {
  assert.equal((await pedir('/api/nada')).estado, 404);
  const res = await fetch(`${base}/..%2f..%2fpackage.json`);
  assert.notEqual(res.status, 200);
});
