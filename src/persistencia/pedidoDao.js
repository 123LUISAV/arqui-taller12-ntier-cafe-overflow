// DAO de pedidos (con sus ítems): solo consulta y guarda. Sin reglas de negocio.
const aItem = (f) => ({
  productoId: f.producto_id, nombre: f.nombre, precioUnitario: f.precio_unitario, cantidad: f.cantidad,
});

export class PedidoDao {
  constructor(db) { this.db = db; }

  #armar(fila) {
    if (!fila) return null;
    const items = this.db.prepare('SELECT * FROM pedido_items WHERE pedido_id = ? ORDER BY id')
      .all(fila.id).map(aItem);
    return {
      id: fila.id, clienteId: fila.cliente_id, estado: fila.estado,
      subtotal: fila.subtotal, porcentajeNivel: fila.porcentaje_nivel,
      descuentoNivel: fila.descuento_nivel, devPointsRedimidos: fila.devpoints_redimidos,
      descuentoDevPoints: fila.descuento_devpoints, total: fila.total, fecha: fila.fecha, items,
    };
  }

  listar() {
    return this.db.prepare('SELECT * FROM pedidos ORDER BY id DESC').all().map((f) => this.#armar(f));
  }

  listarPorCliente(clienteId) {
    return this.db.prepare('SELECT * FROM pedidos WHERE cliente_id = ? ORDER BY id DESC')
      .all(clienteId).map((f) => this.#armar(f));
  }

  obtener(id) {
    return this.#armar(this.db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id));
  }

  buscarPorClienteYEstado(clienteId, estado) {
    return this.#armar(
      this.db.prepare('SELECT * FROM pedidos WHERE cliente_id = ? AND estado = ? LIMIT 1').get(clienteId, estado)
    );
  }

  crear(p) {
    const r = this.db.prepare(
      `INSERT INTO pedidos (cliente_id, estado, subtotal, porcentaje_nivel, descuento_nivel,
        devpoints_redimidos, descuento_devpoints, total, fecha) VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(p.clienteId, p.estado, p.subtotal, p.porcentajeNivel, p.descuentoNivel,
      p.devPointsRedimidos, p.descuentoDevPoints, p.total, p.fecha);
    const id = Number(r.lastInsertRowid);
    const ins = this.db.prepare(
      'INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio_unitario, cantidad) VALUES (?,?,?,?,?)'
    );
    for (const it of p.items) ins.run(id, it.productoId, it.nombre, it.precioUnitario, it.cantidad);
    return this.obtener(id);
  }

  actualizarEstado(id, estado) {
    this.db.prepare('UPDATE pedidos SET estado = ? WHERE id = ?').run(estado, id);
    return this.obtener(id);
  }
}
