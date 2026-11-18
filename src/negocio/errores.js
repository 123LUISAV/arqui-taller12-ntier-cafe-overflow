// Errores propios de la capa de Negocio. No dependen de HTTP ni de la UI:
// la capa de Presentación decide cómo mostrarlos.
export class ErrorNegocio extends Error {
  /**
   * @param {string} codigo identificador estable de la regla violada
   * @param {string} mensaje texto legible para el usuario
   */
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.codigo = codigo;
  }
}

export const CODIGOS = Object.freeze({
  NO_ENCONTRADO: 'NO_ENCONTRADO',
  DATOS_INVALIDOS: 'DATOS_INVALIDOS',
  STOCK_INSUFICIENTE: 'STOCK_INSUFICIENTE',
  PEDIDO_PENDIENTE: 'PEDIDO_PENDIENTE_DE_PAGO',
  CORREO_DUPLICADO: 'CORREO_DUPLICADO',
  PRODUCTO_DUPLICADO: 'PRODUCTO_DUPLICADO',
  ESTADO_FINAL: 'ESTADO_FINAL',
});
