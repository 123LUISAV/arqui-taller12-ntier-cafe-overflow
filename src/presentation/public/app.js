// Capa de Presentación (cliente): renderiza vistas, captura formularios y valida
// la sintaxis. NO calcula totales, descuentos ni ascensos: todo viene del servidor.
const $ = (sel) => document.querySelector(sel);
const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const estado = { productos: [], clientes: [], cantidades: new Map() };

function esc(t) {
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}

async function api(ruta, opciones = {}) {
  const res = await fetch(`/api${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: opciones.cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
  });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.error ?? 'Error inesperado.');
  return datos;
}

let temporizadorAviso;
function avisar(mensaje, tipo = 'ok') {
  const a = $('#aviso');
  a.textContent = mensaje;
  a.className = `aviso ${tipo}`;
  a.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { a.hidden = true; }, tipo === 'ok' ? 5000 : 9000);
}

// ---------- navegación ----------
function mostrarVista(nombre) {
  document.querySelectorAll('.vista').forEach((v) => { v.hidden = v.id !== `vista-${nombre}`; });
  document.querySelectorAll('#pestanas button').forEach((b) => b.classList.toggle('activa', b.dataset.vista === nombre));
  if (nombre === 'pedidos') cargarPedidos();
  if (nombre === 'perfil') cargarPerfil();
  if (nombre === 'pedido') { renderLineasPedido(); cotizar(); }
}
$('#pestanas').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-vista]');
  if (b) mostrarVista(b.dataset.vista);
});

// ---------- datos base ----------
async function cargarBase() {
  [estado.productos, estado.clientes] = await Promise.all([api('/productos'), api('/clientes')]);
  renderProductos();
  renderClientes();
  llenarSelectores();
}

function renderProductos() {
  $('#lista-productos').innerHTML = estado.productos.map((p) => `
    <article class="tarjeta">
      <div class="titulo">${esc(p.nombre)}</div>
      <div class="precio">${cop.format(p.precioBase)}</div>
      <span class="insignia ${p.stock <= 5 ? 'bajo' : ''}">${p.stock === 0 ? 'Agotado' : `Stock: ${p.stock}`}</span>
    </article>`).join('');
}

function renderClientes() {
  $('#lista-clientes').innerHTML = estado.clientes.map((c) => `
    <article class="tarjeta">
      <div class="titulo">${esc(c.nombre)}</div>
      <div class="nota">${esc(c.correo)}</div>
      <span class="insignia nivel-${esc(c.nivel)}">${esc(c.nivel)}</span>
      <span class="insignia">${c.devPoints} DevPoints</span>
    </article>`).join('');
}

function llenarSelectores(conservar = true) {
  for (const id of ['#pedido-cliente', '#perfil-cliente']) {
    const sel = $(id);
    const previo = conservar ? sel.value : '';
    sel.innerHTML = estado.clientes.map((c) => `<option value="${c.id}">${esc(c.nombre)} (${esc(c.nivel)})</option>`).join('');
    if (previo) sel.value = previo;
  }
  infoClientePedido();
}

function infoClientePedido() {
  const c = estado.clientes.find((x) => String(x.id) === $('#pedido-cliente').value);
  $('#pedido-cliente-info').textContent = c ? `Nivel ${c.nivel} · ${c.devPoints} DevPoints disponibles` : '';
}

// ---------- formularios ----------
$('#form-producto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const nombre = f.get('nombre').trim();
  if (!nombre || f.get('precioBase') === '' || f.get('stock') === '') return avisar('Completa nombre, precio y stock.', 'error');
  try {
    await api('/productos', { metodo: 'POST', cuerpo: { nombre, precioBase: Number(f.get('precioBase')), stock: Number(f.get('stock')) } });
    e.target.reset();
    await cargarBase();
    avisar(`Producto "${nombre}" agregado al menú.`);
  } catch (err) { avisar(err.message, 'error'); }
});

$('#form-cliente').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const nombre = f.get('nombre').trim();
  const correo = f.get('correo').trim();
  if (!nombre || !correo) return avisar('El nombre y el correo son obligatorios.', 'error');
  if (!RE_CORREO.test(correo)) return avisar('El correo no tiene un formato válido.', 'error');
  try {
    const c = await api('/clientes', { metodo: 'POST', cuerpo: { nombre, correo } });
    e.target.reset();
    await cargarBase();
    avisar(`Cliente ${c.nombre} registrado como ${c.nivel}.`);
  } catch (err) { avisar(err.message, 'error'); }
});

// ---------- nuevo pedido ----------
function renderLineasPedido() {
  $('#pedido-productos').innerHTML = estado.productos.map((p) => `
    <div class="linea">
      <div class="info"><div class="titulo">${esc(p.nombre)}</div>
        <div class="nota">${cop.format(p.precioBase)} · stock ${p.stock}</div></div>
      <div class="cantidad" data-id="${p.id}">
        <button type="button" data-delta="-1" aria-label="Quitar uno">-</button>
        <input type="number" min="0" step="1" value="${estado.cantidades.get(p.id) ?? 0}" aria-label="Cantidad de ${esc(p.nombre)}">
        <button type="button" data-delta="1" aria-label="Agregar uno">+</button>
      </div>
    </div>`).join('');
}

function itemsSeleccionados() {
  return [...estado.cantidades].filter(([, n]) => n > 0).map(([productoId, cantidad]) => ({ productoId, cantidad }));
}

$('#pedido-productos').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-delta]');
  if (!b) return;
  const cont = b.closest('.cantidad');
  const id = Number(cont.dataset.id);
  const nueva = Math.max(0, (estado.cantidades.get(id) ?? 0) + Number(b.dataset.delta));
  estado.cantidades.set(id, nueva);
  cont.querySelector('input').value = nueva;
  cotizar();
});
$('#pedido-productos').addEventListener('input', (e) => {
  if (e.target.tagName !== 'INPUT') return;
  const id = Number(e.target.closest('.cantidad').dataset.id);
  const n = Math.trunc(Number(e.target.value));
  estado.cantidades.set(id, Number.isFinite(n) && n > 0 ? n : 0);
  cotizar();
});
$('#pedido-devpoints').addEventListener('input', () => cotizar());
$('#pedido-cliente').addEventListener('change', () => { infoClientePedido(); cotizar(); });

function cuerpoPedido() {
  return {
    clienteId: Number($('#pedido-cliente').value),
    devPointsARedimir: Math.max(0, Math.trunc(Number($('#pedido-devpoints').value) || 0)),
    items: itemsSeleccionados(),
  };
}

let tokenCotizacion = 0;
async function cotizar() {
  const resumen = $('#pedido-resumen');
  const cuerpo = cuerpoPedido();
  if (cuerpo.items.length === 0 || !cuerpo.clienteId) {
    resumen.innerHTML = '<p class="nota">Agrega productos para ver el total.</p>';
    return;
  }
  const token = ++tokenCotizacion;
  try {
    const q = await api('/pedidos/cotizar', { metodo: 'POST', cuerpo });
    if (token !== tokenCotizacion) return;
    resumen.innerHTML = `<table>
      <tr><td>Subtotal</td><td>${cop.format(q.subtotal)}</td></tr>
      <tr class="descuento"><td>Descuento nivel (${q.porcentajeNivel} %)</td><td>- ${cop.format(q.descuentoNivel)}</td></tr>
      <tr class="descuento"><td>DevPoints (${q.devPointsRedimidos})</td><td>- ${cop.format(q.descuentoDevPoints)}</td></tr>
      <tr class="total"><td>Total</td><td>${cop.format(q.total)}</td></tr></table>`;
  } catch (err) {
    if (token === tokenCotizacion) resumen.innerHTML = `<p class="aviso error">${esc(err.message)}</p>`;
  }
}

$('#btn-registrar').addEventListener('click', async () => {
  const cuerpo = cuerpoPedido();
  if (cuerpo.items.length === 0) return avisar('Agrega al menos un producto al pedido.', 'error');
  try {
    const p = await api('/pedidos', { metodo: 'POST', cuerpo });
    estado.cantidades.clear();
    $('#pedido-devpoints').value = 0;
    await cargarBase();
    renderLineasPedido();
    cotizar();
    avisar(`Pedido #${p.id} registrado para ${p.clienteNombre}. Total: ${cop.format(p.total)}. Queda pendiente de pago.`);
  } catch (err) { avisar(err.message, 'error'); }
});

// ---------- pedidos ----------
const CLASE_ESTADO = {
  'Pendiente de pago': 'estado-pendiente', 'En Preparación': 'estado-preparacion',
  'Listo': 'estado-listo', 'Entregado': 'estado-entregado',
};

async function cargarPedidos() {
  const pedidos = await api('/pedidos');
  $('#lista-pedidos').innerHTML = pedidos.length === 0
    ? '<p class="nota">Aún no hay pedidos registrados.</p>'
    : pedidos.map((p) => `
    <article class="tarjeta pedido">
      <div class="pedido-cab">
        <div><span class="titulo">Pedido #${p.id}</span> · ${esc(p.clienteNombre)}</div>
        <span class="estado ${CLASE_ESTADO[p.estado]}">${esc(p.estado)}</span>
      </div>
      <div class="nota">${new Date(p.fecha).toLocaleString('es-CO')}</div>
      <ul>${p.items.map((i) => `<li>${i.cantidad} × ${esc(i.nombre)}</li>`).join('')}</ul>
      <div class="nota">Subtotal ${cop.format(p.subtotal)} · nivel -${cop.format(p.descuentoNivel)} · DevPoints -${cop.format(p.descuentoDevPoints)}</div>
      <div class="pedido-cab"><span class="precio">Total ${cop.format(p.total)}</span>
        ${p.siguienteEstado
          ? `<button class="primario" data-avanzar="${p.id}">${p.estado === 'Pendiente de pago' ? 'Confirmar pago' : `Pasar a ${esc(p.siguienteEstado)}`}</button>`
          : '<span class="nota">Completado</span>'}
      </div>
    </article>`).join('');
}

$('#lista-pedidos').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-avanzar]');
  if (!b) return;
  b.disabled = true;
  try {
    const { pedido, recompensa } = await api(`/pedidos/${b.dataset.avanzar}/avanzar`, { metodo: 'POST', cuerpo: {} });
    let msg = `Pedido #${pedido.id}: ${pedido.estado}.`;
    if (recompensa) {
      msg += ` ${pedido.clienteNombre} ganó ${recompensa.devPointsGanados} DevPoints.`;
      if (recompensa.ascendio) msg += ` Ascendió a ${recompensa.nivelNuevo}.`;
    }
    await cargarBase();
    await cargarPedidos();
    avisar(msg);
  } catch (err) { b.disabled = false; avisar(err.message, 'error'); }
});

// ---------- perfil ----------
async function cargarPerfil() {
  const id = $('#perfil-cliente').value;
  if (!id) { $('#perfil-contenido').innerHTML = '<p class="nota">No hay clientes registrados.</p>'; return; }
  try {
    const { cliente: c, descuentoActual, progreso, pedidos } = await api(`/clientes/${id}`);
    $('#perfil-contenido').innerHTML = `
      <div class="tarjeta">
        <div class="titulo">${esc(c.nombre)}</div><div class="nota">${esc(c.correo)}</div>
        <span class="insignia nivel-${esc(c.nivel)}">${esc(c.nivel)}</span>
        <div class="datos">
          <div class="dato"><div class="valor">${descuentoActual} %</div><div class="rotulo">Descuento por nivel</div></div>
          <div class="dato"><div class="valor">${c.devPoints}</div><div class="rotulo">DevPoints (valen $200 c/u)</div></div>
          <div class="dato"><div class="valor">${cop.format(c.montoAcumulado)}</div><div class="rotulo">Acumulado en compras</div></div>
        </div>
        ${progreso.siguienteNivel
          ? `<div class="nota">Progreso a ${esc(progreso.siguienteNivel)}: faltan ${cop.format(progreso.faltante)}</div>
             <div class="barra" role="progressbar" aria-valuenow="${progreso.porcentaje}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progreso.porcentaje}%"></span></div>`
          : '<div class="nota">Nivel máximo alcanzado.</div>'}
      </div>
      <h3>Historial de pedidos</h3>
      ${pedidos.length === 0 ? '<p class="nota">Sin pedidos todavía.</p>' : pedidos.map((p) => `
        <div class="tarjeta" style="margin-bottom:.5rem"><div class="pedido-cab">
          <span>Pedido #${p.id} · ${cop.format(p.total)}</span>
          <span class="estado ${CLASE_ESTADO[p.estado]}">${esc(p.estado)}</span></div></div>`).join('')}`;
  } catch (err) { avisar(err.message, 'error'); }
}
$('#perfil-cliente').addEventListener('change', cargarPerfil);

cargarBase().catch((err) => avisar(`No se pudo cargar la aplicación: ${err.message}`, 'error'));
