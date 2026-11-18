import { DatabaseSync } from 'node:sqlite';
import { ESQUEMA_SQL } from './esquema.js';

/**
 * Abre (o crea) la base SQLite y aplica el esquema.
 * @param {string} ruta ruta del archivo o ':memory:'
 */
export function abrirBaseDeDatos(ruta = ':memory:') {
  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(ESQUEMA_SQL);
  return db;
}

/**
 * Devuelve una función `transaccion(fn)` que ejecuta `fn` de forma atómica.
 * La capa de negocio la recibe por inyección sin conocer SQLite.
 */
export function crearTransaccion(db) {
  return function transaccion(fn) {
    db.exec('BEGIN');
    try {
      const resultado = fn();
      db.exec('COMMIT');
      return resultado;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
}
