// Punto de entrada: `npm start`.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearApp } from './app.js';

const PUERTO = Number(process.env.PORT) || 3000;
const dirDatos = fileURLToPath(new URL('../data/', import.meta.url));
mkdirSync(dirDatos, { recursive: true });
const ruta = process.env.DB_PATH || `${dirDatos}cafe-overflow.db`;

const { servidor } = crearApp({ rutaBaseDatos: ruta });
servidor.listen(PUERTO, () => {
  console.log(`Café Overflow escuchando en http://localhost:${PUERTO}  (base de datos: ${ruta})`);
});
