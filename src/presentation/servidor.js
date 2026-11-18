// Servidor HTTP y enrutador mínimo (sin frameworks). Solo la capa de Presentación.
import { createServer } from 'node:http';
import { crearControladores, traducirError } from './controladores.js';
import { leerJson, responderJson, servirEstatico } from './http.js';

export function crearServidor(negocio) {
  const c = crearControladores(negocio);
  const rutas = [
    ['GET', '/api/productos', c.listarProductos],
    ['POST', '/api/productos', c.crearProducto],
    ['GET', '/api/clientes', c.listarClientes],
    ['POST', '/api/clientes', c.crearCliente],
    ['GET', '/api/clientes/:id', c.perfilCliente],
    ['GET', '/api/pedidos', c.listarPedidos],
    ['POST', '/api/pedidos', c.crearPedido],
    ['POST', '/api/pedidos/cotizar', c.cotizarPedido],
    ['POST', '/api/pedidos/:id/avanzar', c.avanzarPedido],
  ].map(([metodo, patron, manejador]) => ({
    metodo, manejador,
    regex: new RegExp(`^${patron.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
  }));

  return createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      if (!pathname.startsWith('/api/')) {
        if (req.method !== 'GET') return responderJson(res, 405, { error: 'Método no permitido.' });
        return await servirEstatico(res, pathname);
      }
      const coincidencias = rutas.map((r) => ({ r, m: r.regex.exec(pathname) })).filter((x) => x.m);
      if (coincidencias.length === 0) return responderJson(res, 404, { error: 'Ruta no encontrada.' });
      const hallada = coincidencias.find((x) => x.r.metodo === req.method);
      if (!hallada) return responderJson(res, 405, { error: 'Método no permitido.' });
      const cuerpo = req.method === 'POST' ? await leerJson(req) : undefined;
      const { estado, cuerpo: respuesta } = hallada.r.manejador({ params: hallada.m.groups ?? {}, cuerpo });
      return responderJson(res, estado, respuesta);
    } catch (error) {
      const { estado, cuerpo } = traducirError(error);
      return responderJson(res, estado, cuerpo);
    }
  });
}
