// DAO de productos: solo consulta y guarda. Sin reglas de negocio.
const aProducto = (f) => f && ({ id: f.id, nombre: f.nombre, precioBase: f.precio_base, stock: f.stock });

export class ProductoDao {
  constructor(db) { this.db = db; }

  listar() {
    return this.db.prepare('SELECT * FROM productos ORDER BY id').all().map(aProducto);
  }

  obtener(id) {
    return aProducto(this.db.prepare('SELECT * FROM productos WHERE id = ?').get(id)) ?? null;
  }

  obtenerPorNombre(nombre) {
    return aProducto(this.db.prepare('SELECT * FROM productos WHERE lower(nombre) = lower(?)').get(nombre)) ?? null;
  }

  crear({ nombre, precioBase, stock }) {
    const r = this.db.prepare('INSERT INTO productos (nombre, precio_base, stock) VALUES (?, ?, ?)')
      .run(nombre, precioBase, stock);
    return this.obtener(Number(r.lastInsertRowid));
  }

  actualizar({ id, nombre, precioBase, stock }) {
    this.db.prepare('UPDATE productos SET nombre = ?, precio_base = ?, stock = ? WHERE id = ?')
      .run(nombre, precioBase, stock, id);
    return this.obtener(id);
  }

  actualizarStock(id, stock) {
    this.db.prepare('UPDATE productos SET stock = ? WHERE id = ?').run(stock, id);
  }
}
