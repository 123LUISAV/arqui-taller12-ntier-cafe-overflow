// Controladores: traducen HTTP <-> llamadas a la capa de Negocio.
// Reciben el objeto `negocio` por parámetro; no conocen DAOs ni SQL.
import { ErrorNegocio, CODIGOS } from '../negocio/index.js';
import {
  ErrorValidacion, validarProducto, validarCliente, validarPedido, enteroRequerido,
} from './validaciones.js';

const ESTADO_POR_CODIGO = {
  [CODIGOS.NO_ENCONTRADO]: 404,
  [CODIGOS.CORREO_DUPLICADO]: 409,
  [CODIGOS.PRODUCTO_DUPLICADO]: 409,
  [CODIGOS.PEDIDO_PENDIENTE]: 409,
  [CODIGOS.ESTADO_FINAL]: 409,
};

/** Convierte cualquier error en { estado, cuerpo } para la respuesta JSON. */
export function traducirError(error) {
  if (error instanceof ErrorValidacion) return { estado: 400, cuerpo: { error: error.message, codigo: 'VALIDACION' } };
  if (error instanceof ErrorNegocio) {
    return { estado: ESTADO_POR_CODIGO[error.codigo] ?? 422, cuerpo: { error: error.message, codigo: error.codigo } };
  }
  if (error.estado) return { estado: error.estado, cuerpo: { error: error.message, codigo: 'SOLICITUD' } };
  console.error(error);
  return { estado: 500, cuerpo: { error: 'Error interno del servidor.', codigo: 'INTERNO' } };
}

export function crearControladores(negocio) {
  return {
    listarProductos: () => ({ estado: 200, cuerpo: negocio.productos.listar() }),
    crearProducto: ({ cuerpo }) => ({ estado: 201, cuerpo: negocio.productos.crear(validarProducto(cuerpo)) }),

    listarClientes: () => ({ estado: 200, cuerpo: negocio.clientes.listar() }),
    crearCliente: ({ cuerpo }) => ({ estado: 201, cuerpo: negocio.clientes.registrar(validarCliente(cuerpo)) }),
    perfilCliente: ({ params }) => ({ estado: 200, cuerpo: negocio.clientes.perfil(enteroRequerido(params.id, 'id')) }),

    listarPedidos: () => ({ estado: 200, cuerpo: negocio.pedidos.listar() }),
    cotizarPedido: ({ cuerpo }) => ({ estado: 200, cuerpo: negocio.pedidos.cotizar(validarPedido(cuerpo)) }),
    crearPedido: ({ cuerpo }) => ({ estado: 201, cuerpo: negocio.pedidos.registrar(validarPedido(cuerpo)) }),
    avanzarPedido: ({ params }) => ({ estado: 200, cuerpo: negocio.pedidos.avanzarEstado(enteroRequerido(params.id, 'id')) }),
  };
}
