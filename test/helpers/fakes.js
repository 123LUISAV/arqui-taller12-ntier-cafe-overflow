// DAOs falsos en memoria: cumplen el mismo contrato que los de persistencia/
// y permiten probar la capa de Negocio de forma aislada.
export function crearDaosFalsos({ productos = [], clientes = [] } = {}) {
  const tProductos = new Map(productos.map((p) => [p.id, { ...p }]));
  const tClientes = new Map(clientes.map((c) => [c.id, { ...c }]));
  const tPedidos = new Map();
  let sigProd = Math.max(0, ...tProductos.keys()) + 1;
  let sigCli = Math.max(0, ...tClientes.keys()) + 1;
  let sigPed = 1;
  const copia = (x) => (x ? structuredClone(x) : null);

  const productoDao = {
    listar: () => [...tProductos.values()].map(copia),
    obtener: (id) => copia(tProductos.get(id)),
    obtenerPorNombre: (n) => copia([...tProductos.values()].find((p) => p.nombre.toLowerCase() === n.toLowerCase())),
    crear: (p) => { const x = { id: sigProd++, ...p }; tProductos.set(x.id, x); return copia(x); },
    actualizar: (p) => { tProductos.set(p.id, { ...p }); return copia(p); },
    actualizarStock: (id, stock) => { tProductos.get(id).stock = stock; },
  };
  const clienteDao = {
    listar: () => [...tClientes.values()].map(copia),
    obtener: (id) => copia(tClientes.get(id)),
    obtenerPorCorreo: (c) => copia([...tClientes.values()].find((x) => x.correo.toLowerCase() === c.toLowerCase())),
    crear: (c) => { const x = { id: sigCli++, ...c }; tClientes.set(x.id, x); return copia(x); },
    actualizar: (c) => { tClientes.set(c.id, { ...c }); return copia(c); },
  };
  const pedidoDao = {
    listar: () => [...tPedidos.values()].map(copia).reverse(),
    listarPorCliente: (id) => [...tPedidos.values()].filter((p) => p.clienteId === id).map(copia).reverse(),
    obtener: (id) => copia(tPedidos.get(id)),
    buscarPorClienteYEstado: (cid, e) => copia([...tPedidos.values()].find((p) => p.clienteId === cid && p.estado === e)),
    crear: (p) => { const x = { id: sigPed++, ...copia(p) }; tPedidos.set(x.id, x); return copia(x); },
    actualizarEstado: (id, estado) => { tPedidos.get(id).estado = estado; return copia(tPedidos.get(id)); },
  };
  return { productoDao, clienteDao, pedidoDao };
}

export const PRODUCTOS_BASE = [
  { id: 1, nombre: 'Espresso StackTrace', precioBase: 10000, stock: 10 },
  { id: 2, nombre: 'Combo BugHunter', precioBase: 20000, stock: 3 },
];

export const clienteBase = (extra = {}) => ({
  id: 1, nombre: 'Luisa Prueba', correo: 'prueba@ejemplo.com',
  nivel: 'Junior', devPoints: 0, montoAcumulado: 0, ...extra,
});
