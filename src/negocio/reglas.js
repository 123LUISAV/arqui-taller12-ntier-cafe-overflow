// Reglas de negocio puras de Café Overflow. Sin I/O, sin HTML/JSON, sin SQL.
// Cada función corresponde a una regla del enunciado y es fácil de probar sola.

export const NIVELES = Object.freeze({ JUNIOR: 'Junior', MID: 'Mid', SENIOR: 'Senior' });

export const ESTADOS = Object.freeze({
  PENDIENTE_PAGO: 'Pendiente de pago',
  EN_PREPARACION: 'En Preparación',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
});

/** Orden permitido del flujo del pedido (solo hacia adelante). */
export const FLUJO_ESTADOS = Object.freeze([
  ESTADOS.PENDIENTE_PAGO, ESTADOS.EN_PREPARACION, ESTADOS.LISTO, ESTADOS.ENTREGADO,
]);

export const UMBRAL_MID = 500_000;
export const UMBRAL_SENIOR = 1_500_000;
export const MONTO_POR_DEVPOINT = 20_000;
export const VALOR_DEVPOINT = 200;

const PORCENTAJE_DESCUENTO = { [NIVELES.JUNIOR]: 5, [NIVELES.MID]: 10, [NIVELES.SENIOR]: 15 };

/** Regla 1: porcentaje de descuento según el nivel del cliente. */
export function porcentajeDescuento(nivel) {
  const p = PORCENTAJE_DESCUENTO[nivel];
  if (p === undefined) throw new Error(`Nivel desconocido: ${nivel}`);
  return p;
}

/** Regla 2: nivel que corresponde a un monto acumulado de compras completadas. */
export function nivelPorAcumulado(montoAcumulado) {
  if (montoAcumulado >= UMBRAL_SENIOR) return NIVELES.SENIOR;
  if (montoAcumulado >= UMBRAL_MID) return NIVELES.MID;
  return NIVELES.JUNIOR;
}

const ORDEN_NIVEL = [NIVELES.JUNIOR, NIVELES.MID, NIVELES.SENIOR];

/** Nunca se desciende de nivel: se conserva el mayor entre el actual y el calculado. */
export function nivelResultante(nivelActual, montoAcumulado) {
  const calculado = nivelPorAcumulado(montoAcumulado);
  return ORDEN_NIVEL.indexOf(calculado) > ORDEN_NIVEL.indexOf(nivelActual) ? calculado : nivelActual;
}

/** Progreso hacia el siguiente nivel (para el perfil del cliente). */
export function progresoSiguienteNivel(nivel, montoAcumulado) {
  if (nivel === NIVELES.SENIOR) return { siguienteNivel: null, faltante: 0, porcentaje: 100 };
  const [siguienteNivel, meta, base] = nivel === NIVELES.JUNIOR
    ? [NIVELES.MID, UMBRAL_MID, 0]
    : [NIVELES.SENIOR, UMBRAL_SENIOR, UMBRAL_MID];
  const faltante = Math.max(meta - montoAcumulado, 0);
  const porcentaje = Math.min(100, Math.max(0, Math.floor(((montoAcumulado - base) / (meta - base)) * 100)));
  return { siguienteNivel, faltante, porcentaje };
}

/** Regla 3: DevPoints ganados por un pedido completado (1 por cada $20.000 pagados). */
export function devPointsGanados(totalPagado) {
  return Math.floor(totalPagado / MONTO_POR_DEVPOINT);
}

/**
 * Cálculo del pedido: primero el descuento por nivel (regla 1) y después los
 * DevPoints redimidos (regla 3), a $200 cada uno. Los DevPoints usados se limitan
 * al saldo del cliente y a lo que falta por pagar, de modo que el total nunca sea negativo.
 */
export function calcularTotales({ items, nivel, devPointsSolicitados = 0, saldoDevPoints }) {
  const subtotal = items.reduce((acc, it) => acc + it.precioUnitario * it.cantidad, 0);
  const porcentajeNivel = porcentajeDescuento(nivel);
  const descuentoNivel = Math.round((subtotal * porcentajeNivel) / 100);
  const tras = subtotal - descuentoNivel;
  const maximoUtil = Math.floor(tras / VALOR_DEVPOINT);
  const devPointsRedimidos = Math.max(0, Math.min(devPointsSolicitados, saldoDevPoints, maximoUtil));
  const descuentoDevPoints = devPointsRedimidos * VALOR_DEVPOINT;
  return {
    subtotal, porcentajeNivel, descuentoNivel,
    devPointsRedimidos, descuentoDevPoints,
    total: tras - descuentoDevPoints,
  };
}

/** Siguiente estado del flujo, o null si ya está en el último. */
export function siguienteEstado(estado) {
  const i = FLUJO_ESTADOS.indexOf(estado);
  if (i === -1) throw new Error(`Estado desconocido: ${estado}`);
  return FLUJO_ESTADOS[i + 1] ?? null;
}
