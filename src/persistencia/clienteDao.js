// DAO de clientes: solo consulta y guarda. Sin reglas de negocio.
const aCliente = (f) => f && ({
  id: f.id, nombre: f.nombre, correo: f.correo, nivel: f.nivel,
  devPoints: f.devpoints, montoAcumulado: f.monto_acumulado,
});

export class ClienteDao {
  constructor(db) { this.db = db; }

  listar() {
    return this.db.prepare('SELECT * FROM clientes ORDER BY id').all().map(aCliente);
  }

  obtener(id) {
    return aCliente(this.db.prepare('SELECT * FROM clientes WHERE id = ?').get(id)) ?? null;
  }

  obtenerPorCorreo(correo) {
    return aCliente(this.db.prepare('SELECT * FROM clientes WHERE lower(correo) = lower(?)').get(correo)) ?? null;
  }

  crear({ nombre, correo, nivel, devPoints, montoAcumulado }) {
    const r = this.db.prepare(
      'INSERT INTO clientes (nombre, correo, nivel, devpoints, monto_acumulado) VALUES (?, ?, ?, ?, ?)'
    ).run(nombre, correo, nivel, devPoints, montoAcumulado);
    return this.obtener(Number(r.lastInsertRowid));
  }

  actualizar({ id, nombre, correo, nivel, devPoints, montoAcumulado }) {
    this.db.prepare(
      'UPDATE clientes SET nombre = ?, correo = ?, nivel = ?, devpoints = ?, monto_acumulado = ? WHERE id = ?'
    ).run(nombre, correo, nivel, devPoints, montoAcumulado, id);
    return this.obtener(id);
  }
}
