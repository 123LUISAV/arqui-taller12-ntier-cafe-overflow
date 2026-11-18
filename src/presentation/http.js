// Utilidades HTTP: lectura de cuerpo JSON, respuestas JSON y archivos estáticos.
// El JSON se serializa AQUÍ (Presentación); Negocio solo devuelve objetos.
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_PUBLICA = fileURLToPath(new URL('./public/', import.meta.url));

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function responderJson(res, estado, datos) {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(cuerpo) });
  res.end(cuerpo);
}

export async function leerJson(req) {
  const trozos = [];
  let tamano = 0;
  for await (const t of req) {
    tamano += t.length;
    if (tamano > 1_000_000) throw Object.assign(new Error('Cuerpo demasiado grande.'), { estado: 413 });
    trozos.push(t);
  }
  if (trozos.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(trozos).toString('utf8'));
  } catch {
    throw Object.assign(new Error('El cuerpo no es un JSON válido.'), { estado: 400 });
  }
}

export async function servirEstatico(res, rutaUrl) {
  const relativa = rutaUrl === '/' ? 'index.html' : decodeURIComponent(rutaUrl).replace(/^\/+/, '');
  const ruta = normalize(join(RAIZ_PUBLICA, relativa));
  if (!ruta.startsWith(RAIZ_PUBLICA.endsWith(sep) ? RAIZ_PUBLICA : RAIZ_PUBLICA + sep)) {
    return responderJson(res, 403, { error: 'Acceso denegado.' });
  }
  try {
    const contenido = await readFile(ruta);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] ?? 'application/octet-stream' });
    res.end(contenido);
  } catch {
    responderJson(res, 404, { error: 'Recurso no encontrado.' });
  }
}
