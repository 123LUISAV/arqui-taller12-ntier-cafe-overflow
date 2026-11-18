// Validación SINTÁCTICA de los formularios (requeridos, tipos, formato de correo).
// Aquí NO se calculan totales ni se aplican reglas de negocio.
export class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorValidacion';
  }
}

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function textoRequerido(valor, campo) {
  if (typeof valor !== 'string' || valor.trim() === '') throw new ErrorValidacion(`El campo "${campo}" es obligatorio.`);
  return valor.trim();
}

export function correoValido(valor) {
  const correo = textoRequerido(valor, 'correo');
  if (!RE_CORREO.test(correo)) throw new ErrorValidacion('El correo no tiene un formato válido (ej. nombre@dominio.com).');
  return correo;
}

export function enteroRequerido(valor, campo) {
  const n = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
  if (!Number.isInteger(n)) throw new ErrorValidacion(`El campo "${campo}" debe ser un número entero.`);
  return n;
}

export function enteroOpcional(valor, campo, porDefecto = 0) {
  return valor === undefined || valor === null || valor === '' ? porDefecto : enteroRequerido(valor, campo);
}

export function validarProducto(cuerpo) {
  return {
    nombre: textoRequerido(cuerpo?.nombre, 'nombre'),
    precioBase: enteroRequerido(cuerpo?.precioBase, 'precio'),
    stock: enteroRequerido(cuerpo?.stock, 'stock'),
  };
}

export function validarCliente(cuerpo) {
  return { nombre: textoRequerido(cuerpo?.nombre, 'nombre'), correo: correoValido(cuerpo?.correo) };
}

export function validarPedido(cuerpo) {
  if (!Array.isArray(cuerpo?.items)) throw new ErrorValidacion('Debes enviar la lista de productos del pedido.');
  return {
    clienteId: enteroRequerido(cuerpo.clienteId, 'cliente'),
    devPointsARedimir: enteroOpcional(cuerpo.devPointsARedimir, 'DevPoints a redimir'),
    items: cuerpo.items.map((it) => ({
      productoId: enteroRequerido(it?.productoId, 'producto'),
      cantidad: enteroRequerido(it?.cantidad, 'cantidad'),
    })),
  };
}
