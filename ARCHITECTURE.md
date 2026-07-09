# Arquitectura

## Objetivo

Sistema local para un cobrador que maneja cartera y creditos por abonos. El flujo principal es:

1. Entrar con PIN.
2. Revisar cartera y atrasos.
3. Revisar las cuentas prioritarias por atraso y saldo.
4. Seleccionar cliente.
5. Revisar si el cliente es moroso y su calificacion dentro del ranking.
6. Ver Top 10 buenos compradores y Top 10 morosos con criterios claros de consumo, puntualidad, adeudo y atraso.
7. Registrar abono.
8. Buscar, filtrar, revisar, editar o imprimir tickets de abonos desde el historial.
9. Revisar movimientos, avance, ultimo abono y siguiente pago.
10. Identificar el expediente con folio, referencia, producto/cuenta y foto de INE.
11. Registrar seguimiento o promesa de pago.
12. Registrar, editar y controlar articulos del inventario.
13. Registrar cargos/ventas y descontar articulos del inventario.
14. Revisar metodo de pago, meta diaria y agenda.
15. Registrar gastos del turno y revisar efectivo a entregar.
16. Imprimir o mandar ticket por WhatsApp.
17. Respaldar o exportar cartera.

## Frontend

Archivos:

- `index.html`: carga la app.
- `styles.css`: diseno responsive, navegacion movil, paneles, tablas y tickets.
- `app.js`: estado, reglas de negocio, UI, formularios, tickets, WhatsApp, control de productos/cuentas y sincronizacion con API.
- Tambien contiene ranking de clientes buenos/malos, control de morosos, foto de INE e inventario editable de articulos.
- La foto de INE se toma desde el formulario, se optimiza en el navegador y se sube al backend local o Firebase Storage antes de guardar la URL en el expediente.
- Si existe `firebase-config.js` con configuracion real, el frontend activa Firebase y sincroniza contra Realtime Database/Storage sin usar `server.js`.

No usa React ni build step; abre directo desde el servidor Node.

## Backend

Archivo:

- `server.js`

Funciones:

- Sirve el frontend.
- Expone API REST basica.
- Guarda datos en `data/cobranza-db.json`.
- Guarda fotos de INE en `uploads/ine` y devuelve una URL para el expediente del cliente.
- Genera datos demo si no existe base.
- Permite reset, exportacion y guardado de la base completa.

## Firebase

Archivos:

- `firebase.json`: Hosting, reglas y despliegue.
- `firebase-config.js`: configuracion Web del proyecto Firebase.
- `database.rules.json`: reglas para Realtime Database.
- `firestore.rules`: permite lectura/escritura solo con usuario autenticado.
- `storage.rules`: permite imagenes de INE menores a 5 MB con usuario autenticado.

Servicios:

- Firebase Hosting sirve la app estatica.
- Firebase Authentication debe tener habilitado el proveedor `Email/Password`.
- Realtime Database guarda un registro principal en `apps/carteraPrincipal`.
- Firestore queda disponible como proveedor opcional si se cambia `databaseProvider` a `firestore`.
- Firebase Storage guarda fotos en `ine/`.

Cuando Firebase esta activo:

```text
loadDB() -> Realtime Database
saveDB() -> Realtime Database
uploadInePhoto() -> Firebase Storage
```

Cuando Firebase no esta configurado:

```text
loadDB() -> backend Node / respaldo local
saveDB() -> backend Node / respaldo local
uploadInePhoto() -> endpoint Node / respaldo local
```

## Modelo de datos

```text
settings
clients[]
  cuenta/referencia
  credito
  ineFoto (URL del servidor o respaldo local si no hay conexion)
  movimientos[]
  seguimientos[]
items[]
  sku/nombre/categoria
  stock/minStock
  costo/precio
routeExpenses[]
audit[]
```

Los movimientos positivos son cargos/creditos. Los negativos son abonos. El saldo se calcula con:

```text
saldo = cargos - abonos
```

## Expediente y estado de cuenta

- Cada cliente se identifica por folio, nombre, telefono, referencia y producto/cuenta.
- El cobrador puede tocar `Cobrar` y abrir automaticamente el cliente prioritario segun atraso y saldo.
- El expediente muestra saldo, credito, abonos, avance, ultimo pago, siguiente pago, INE, movimientos y bitacora.
- El cobrador puede mandar por WhatsApp o copiar un estado de cuenta con resumen completo.
- Los cargos nuevos pueden ligarse a un articulo para descontar stock del inventario.

## API

```text
GET  /api/health
GET  /api/db
PUT  /api/db
POST /api/upload/ine
POST /api/db/reset
GET  /api/db/export
```

## Produccion

Para uso real multiusuario se recomienda agregar:

- Autenticacion real con sesiones.
- Password/PIN cifrado.
- Base de datos cloud.
- HTTPS.
- Respaldos automaticos.
- Control de permisos por usuario.
