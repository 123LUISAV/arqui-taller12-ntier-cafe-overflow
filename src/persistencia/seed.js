// Datos iniciales de demostración. Solo inserta si las tablas están vacías.
const PRODUCTOS = [
  ['Espresso StackTrace', 7000, 60],
  ['Combo BugHunter', 18000, 40],
  ['Té Async/Await', 6000, 50],
  ['Latte NullPointer', 9500, 45],
  ['Cold Brew Docker', 10500, 30],
  ['Brownie Merge Conflict', 8500, 25],
  ['Sándwich Full Stack', 15500, 5],
  ['Capuchino Recursivo', 8000, 55],
];

const CLIENTES = [
  ['Camila Rojas', 'camila.rojas@ejemplo.com', 'Junior', 0, 0],
  ['Andrés Pardo', 'andres.pardo@ejemplo.com', 'Mid', 20, 650000],
  ['Valentina Gómez', 'valentina.gomez@ejemplo.com', 'Senior', 90, 1800000],
];

export function sembrarDatos(db) {
  const { n: productos } = db.prepare('SELECT COUNT(*) AS n FROM productos').get();
  if (productos === 0) {
    const ins = db.prepare('INSERT INTO productos (nombre, precio_base, stock) VALUES (?, ?, ?)');
    for (const p of PRODUCTOS) ins.run(...p);
  }
  const { n: clientes } = db.prepare('SELECT COUNT(*) AS n FROM clientes').get();
  if (clientes === 0) {
    const ins = db.prepare(
      'INSERT INTO clientes (nombre, correo, nivel, devpoints, monto_acumulado) VALUES (?, ?, ?, ?, ?)'
    );
    for (const c of CLIENTES) ins.run(...c);
  }
}
