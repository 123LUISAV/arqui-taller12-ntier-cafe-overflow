// Esquema relacional de SQLite. Solo define la estructura de almacenamiento;
// ninguna regla de negocio vive aquí.
export const ESQUEMA_SQL = `
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  precio_base INTEGER NOT NULL,
  stock INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  nivel TEXT NOT NULL,
  devpoints INTEGER NOT NULL DEFAULT 0,
  monto_acumulado INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  estado TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  porcentaje_nivel INTEGER NOT NULL,
  descuento_nivel INTEGER NOT NULL,
  devpoints_redimidos INTEGER NOT NULL,
  descuento_devpoints INTEGER NOT NULL,
  total INTEGER NOT NULL,
  fecha TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  nombre TEXT NOT NULL,
  precio_unitario INTEGER NOT NULL,
  cantidad INTEGER NOT NULL
);
`;
