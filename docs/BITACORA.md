# Bitácora - Taller 12, Café Overflow

Estudiante: Luisa Fernanda Velandia Salamanca (U00179371) - UNAB - Arquitectura de Software - Docente MSc. Feisar Moreno - Noviembre de 2026.

## Cronología

1. **Lectura del enunciado y decisiones de diseño.** Se eligió Node.js 24 sin dependencias (`node:http`, `node:sqlite`) y HTML/CSS/JS vanilla para cumplir "sin frameworks". Se definió la estructura `presentation / negocio / persistencia` con dependencias solo hacia abajo y un composition root (`src/app.js`).
2. **Estructura inicial.** `package.json`, `.gitignore`.
3. **Persistencia.** Esquema de cuatro tablas (`productos`, `clientes`, `pedidos`, `pedido_items`), DAOs que solo consultan y guardan, seed con 8 productos temáticos y 3 clientes (Junior, Mid y Senior), y una función `transaccion` para operaciones atómicas.
4. **Negocio.** `reglas.js` con funciones puras por cada regla, tres servicios y errores propios (`ErrorNegocio` con código). Los DAOs llegan por inyección.
5. **Pruebas.** Suite con `node --test`: reglas puras, servicios con DAOs falsos, integración con SQLite en memoria.
6. **Presentación.** Servidor HTTP y enrutador propios, validación sintáctica, controladores y UI vanilla (menú, nuevo pedido, pedidos, clientes, perfil). Pruebas HTTP de extremo a extremo.
7. **Capturas y diagramas C4.** Capturas con Chrome headless; diagramas en Mermaid exportados con `mermaid-cli` desde una carpeta de herramientas fuera del repo (no son dependencias del proyecto).
8. **Documentación e informe.**

## Decisiones e interpretaciones

- **"Compra completada" = pedido Entregado.** Solo al pasar a Entregado se suma el total al acumulado, se otorgan DevPoints y se evalúa el ascenso. Así un pedido que nunca se paga o entrega no sube de nivel.
- **Orden de descuentos.** Primero el descuento de nivel sobre el subtotal; después los DevPoints redimidos ($200 c/u). Los DevPoints usados se limitan al saldo del cliente y a lo que falta por pagar, para que el total no sea negativo.
- **Redención voluntaria.** El cliente indica cuántos DevPoints quiere redimir (0 por defecto), tal como dice el enunciado ("puede decidir").
- **Stock.** Se descuenta al registrar el pedido (reserva). Las líneas repetidas del mismo producto se suman antes de compararlas con el stock.
- **DevPoints ganados** = `floor(total pagado / 20000)`, sobre el total ya con descuentos.
- **Flujo de estados** solo hacia adelante: Pendiente de pago, En Preparación, Listo, Entregado. Pasar de Pendiente a En Preparación equivale a confirmar el pago. No hay cancelación (no está en el enunciado).
- **Nivel nunca desciende.** Se conserva el mayor entre el actual y el calculado por acumulado.
- **Redondeo.** Los montos son enteros en pesos; el descuento de nivel se redondea al entero más cercano.
- **Transacciones.** Registrar y avanzar estado se ejecutan en una transacción inyectada, para que un fallo a mitad de camino no deje datos inconsistentes (hay una prueba de rollback).
- **Endpoint de cotización.** Como Presentación no puede calcular totales, la UI llama a `/api/pedidos/cotizar` para mostrar el resumen antes de registrar.
- **JSON en Presentación.** Negocio devuelve objetos JavaScript; la serialización a JSON ocurre en `src/presentation/http.js`.
- **Diagramas.** El soporte nativo C4 de Mermaid generó etiquetas superpuestas, así que se dibujaron como `flowchart` con la notación y colores de C4 (persona, sistema, contenedor, componente).

## Cómo probar cada regla

Automático: `npm test`. Manual en la UI (`npm start`, http://localhost:3000):

| Regla | Prueba manual |
|---|---|
| 1. Descuento por nivel | En "Nuevo pedido" elegir Camila (Junior), Andrés (Mid) y Valentina (Senior) con el mismo producto: el resumen muestra 5 %, 10 % y 15 % |
| 2. Cliente nuevo | En "Clientes" registrar uno: aparece como Junior con 0 DevPoints |
| 2. Ascenso | Registrar pedidos grandes a un cliente y avanzarlos hasta Entregado; el aviso informa el ascenso y el perfil muestra la barra de progreso |
| 3. DevPoints ganados | Entregar un pedido de $60.000 o más: el aviso indica los DevPoints ganados |
| 3. Redención | En "Nuevo pedido" escribir DevPoints a redimir: el resumen descuenta $200 por cada uno |
| 4a. Stock | Pedir 6 unidades de "Sándwich Full Stack" (stock 5): error de stock insuficiente |
| 4b. Pedido pendiente | Registrar un pedido y, sin confirmar el pago, intentar otro para el mismo cliente: error |

## Resultado real de las pruebas

Ejecutado con `npm test` (Node v24.19.0):

```
ℹ tests 38
ℹ pass 38
ℹ fail 0
```

Distribución: 9 de reglas puras, 19 de servicios con DAOs falsos, 4 de integración con SQLite en memoria (incluye ciclo completo y rollback) y 6 de extremo a extremo por HTTP.

La aplicación también se ejecutó de verdad (servidor en el puerto 3055 con una base temporal) y se recorrieron los flujos con Chrome headless para obtener las capturas de `docs/capturas/`; el servidor se apagó al terminar.
