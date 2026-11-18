import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  porcentajeDescuento, nivelPorAcumulado, nivelResultante, devPointsGanados,
  calcularTotales, progresoSiguienteNivel, siguienteEstado, ESTADOS,
} from '../src/negocio/reglas.js';

test('Regla 1: descuento por nivel 5/10/15 %', () => {
  assert.equal(porcentajeDescuento('Junior'), 5);
  assert.equal(porcentajeDescuento('Mid'), 10);
  assert.equal(porcentajeDescuento('Senior'), 15);
});

test('Regla 1: el descuento se aplica sobre el total', () => {
  const items = [{ precioUnitario: 10000, cantidad: 2 }];
  for (const [nivel, desc] of [['Junior', 1000], ['Mid', 2000], ['Senior', 3000]]) {
    const t = calcularTotales({ items, nivel, saldoDevPoints: 0 });
    assert.equal(t.subtotal, 20000);
    assert.equal(t.descuentoNivel, desc);
    assert.equal(t.total, 20000 - desc);
  }
});

test('Regla 2: ascenso en los umbrales exactos y justo antes', () => {
  assert.equal(nivelPorAcumulado(0), 'Junior');
  assert.equal(nivelPorAcumulado(499_999), 'Junior');
  assert.equal(nivelPorAcumulado(500_000), 'Mid');
  assert.equal(nivelPorAcumulado(1_499_999), 'Mid');
  assert.equal(nivelPorAcumulado(1_500_000), 'Senior');
});

test('Regla 2: un cliente nunca desciende de nivel', () => {
  assert.equal(nivelResultante('Senior', 100), 'Senior');
  assert.equal(nivelResultante('Mid', 600_000), 'Mid');
  assert.equal(nivelResultante('Junior', 600_000), 'Mid');
});

test('Regla 2: progreso hacia el siguiente nivel', () => {
  assert.deepEqual(progresoSiguienteNivel('Junior', 250_000), { siguienteNivel: 'Mid', faltante: 250_000, porcentaje: 50 });
  assert.deepEqual(progresoSiguienteNivel('Senior', 2_000_000), { siguienteNivel: null, faltante: 0, porcentaje: 100 });
});

test('Regla 3: 1 DevPoint por cada $20.000', () => {
  assert.equal(devPointsGanados(19_999), 0);
  assert.equal(devPointsGanados(20_000), 1);
  assert.equal(devPointsGanados(59_999), 2);
  assert.equal(devPointsGanados(100_000), 5);
});

test('Regla 3: cada DevPoint redimido descuenta $200 después del descuento de nivel', () => {
  const items = [{ precioUnitario: 20000, cantidad: 1 }];
  const t = calcularTotales({ items, nivel: 'Mid', devPointsSolicitados: 5, saldoDevPoints: 10 });
  assert.equal(t.descuentoNivel, 2000);
  assert.equal(t.devPointsRedimidos, 5);
  assert.equal(t.descuentoDevPoints, 1000);
  assert.equal(t.total, 17000);
});

test('Regla 3: los DevPoints se limitan al saldo y nunca dejan el total negativo', () => {
  const items = [{ precioUnitario: 1000, cantidad: 1 }];
  const limitadoSaldo = calcularTotales({ items, nivel: 'Junior', devPointsSolicitados: 50, saldoDevPoints: 2 });
  assert.equal(limitadoSaldo.devPointsRedimidos, 2);
  const limitadoTotal = calcularTotales({ items, nivel: 'Junior', devPointsSolicitados: 500, saldoDevPoints: 500 });
  assert.equal(limitadoTotal.devPointsRedimidos, 4); // 950 / 200 = 4
  assert.ok(limitadoTotal.total >= 0);
});

test('El flujo de estados solo avanza', () => {
  assert.equal(siguienteEstado(ESTADOS.PENDIENTE_PAGO), ESTADOS.EN_PREPARACION);
  assert.equal(siguienteEstado(ESTADOS.EN_PREPARACION), ESTADOS.LISTO);
  assert.equal(siguienteEstado(ESTADOS.LISTO), ESTADOS.ENTREGADO);
  assert.equal(siguienteEstado(ESTADOS.ENTREGADO), null);
});
