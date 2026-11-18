// Fachada de la capa de Negocio. Recibe los DAOs por inyección de dependencias:
// no importa nada de persistencia ni de presentación.
import { ProductoService } from './productoService.js';
import { ClienteService } from './clienteService.js';
import { PedidoService } from './pedidoService.js';

export { ErrorNegocio, CODIGOS } from './errores.js';

export function crearNegocio({ productoDao, clienteDao, pedidoDao, transaccion, reloj }) {
  return {
    productos: new ProductoService({ productoDao }),
    clientes: new ClienteService({ clienteDao, pedidoDao }),
    pedidos: new PedidoService({ productoDao, clienteDao, pedidoDao, transaccion, reloj }),
  };
}
