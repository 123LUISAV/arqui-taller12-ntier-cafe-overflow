// Fachada de la capa de Persistencia: lo único que importa la composición raíz.
import { abrirBaseDeDatos, crearTransaccion } from './conexion.js';
import { sembrarDatos } from './seed.js';
import { ProductoDao } from './productoDao.js';
import { ClienteDao } from './clienteDao.js';
import { PedidoDao } from './pedidoDao.js';

export function crearPersistencia({ ruta = ':memory:', sembrar = true } = {}) {
  const db = abrirBaseDeDatos(ruta);
  if (sembrar) sembrarDatos(db);
  return {
    productoDao: new ProductoDao(db),
    clienteDao: new ClienteDao(db),
    pedidoDao: new PedidoDao(db),
    transaccion: crearTransaccion(db),
    cerrar: () => db.close(),
  };
}
