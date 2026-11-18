// Composition root: único lugar donde se conectan las tres capas.
//   Presentación -> Negocio -> Persistencia (las dependencias solo apuntan hacia abajo).
import { crearPersistencia } from './persistencia/index.js';
import { crearNegocio } from './negocio/index.js';
import { crearServidor } from './presentation/servidor.js';

export function crearApp({ rutaBaseDatos = ':memory:', sembrar = true } = {}) {
  const persistencia = crearPersistencia({ ruta: rutaBaseDatos, sembrar });
  const negocio = crearNegocio(persistencia);
  const servidor = crearServidor(negocio);
  return { servidor, negocio, cerrar: () => { servidor.close(); persistencia.cerrar(); } };
}
