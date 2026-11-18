import { ErrorNegocio, CODIGOS } from './errores.js';

export class ProductoService {
  /** @param {{productoDao: object}} deps DAOs inyectados (contrato, no implementación) */
  constructor({ productoDao }) {
    this.productoDao = productoDao;
  }

  listar() {
    return this.productoDao.listar();
  }

  obtener(id) {
    const p = this.productoDao.obtener(id);
    if (!p) throw new ErrorNegocio(CODIGOS.NO_ENCONTRADO, `No existe el producto ${id}.`);
    return p;
  }

  crear({ nombre, precioBase, stock }) {
    this.#validar({ nombre, precioBase, stock });
    if (this.productoDao.obtenerPorNombre(nombre.trim())) {
      throw new ErrorNegocio(CODIGOS.PRODUCTO_DUPLICADO, `Ya existe un producto llamado "${nombre.trim()}".`);
    }
    return this.productoDao.crear({ nombre: nombre.trim(), precioBase, stock });
  }

  actualizar(id, { nombre, precioBase, stock }) {
    this.obtener(id);
    this.#validar({ nombre, precioBase, stock });
    return this.productoDao.actualizar({ id, nombre: nombre.trim(), precioBase, stock });
  }

  #validar({ nombre, precioBase, stock }) {
    if (typeof nombre !== 'string' || nombre.trim() === '') {
      throw new ErrorNegocio(CODIGOS.DATOS_INVALIDOS, 'El nombre del producto es obligatorio.');
    }
    if (!Number.isInteger(precioBase) || precioBase <= 0) {
      throw new ErrorNegocio(CODIGOS.DATOS_INVALIDOS, 'El precio base debe ser un entero mayor que cero.');
    }
    if (!Number.isInteger(stock) || stock < 0) {
      throw new ErrorNegocio(CODIGOS.DATOS_INVALIDOS, 'El stock debe ser un entero mayor o igual a cero.');
    }
  }
}
