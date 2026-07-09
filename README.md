# Novedades y Muebles Miry - Cartera y Abonos

Aplicación full-stack local para un cobrador que maneja cartera, créditos y pagos en abonos. Esta versión está enfocada en clientes, saldos pendientes, abonos semanales, comprobantes, artículos y recordatorios por WhatsApp.

## Incluye

- Frontend operativo: `index.html`, `styles.css`, `app.js`.
- Backend Node.js sin dependencias: `server.js`.
- Modo Firebase opcional: Hosting + Realtime Database + Storage para trabajar en la nube.
- Base de datos JSON local: `data/cobranza-db.json`.
- Respaldo local de emergencia en el navegador.
- Login por PIN del cobrador.
- Clientes con cuenta/referencia, crédito y saldo.
- Foto de INE por cliente dentro del expediente, capturada desde cámara, optimizada y guardada en `uploads/ine`.
- En Firebase, las fotos de INE se guardan en Firebase Storage y la cartera en Realtime Database.
- Top 10 buenos compradores: clientes que consumen, abonan y pagan a tiempo y forma.
- Top 10 morosos: clientes con adeudo activo y pago vencido.
- Registro de abonos y cargos nuevos.
- Historial de abonos con acciones para ver detalle, editar monto/fecha/método/concepto y abrir ticket específico.
- Búsqueda y filtros de abonos por cliente, folio, cuenta, concepto, monto, periodo y método de pago.
- Inventario de artículos con alta, edición, cantidad, precio, costo, mínimo y alertas de cantidad baja.
- Venta/cargo opcional ligado a artículo para descontar cantidad.
- Navegación inferior y botón rápido `Cobrar` optimizados para celular.
- Interfaz profesional con microanimaciones, transiciones suaves, progreso animado y soporte móvil tipo app.
- Botón `Cobrar` que abre directo el cliente prioritario con saldo pendiente.
- Acciones rápidas: llamar, WhatsApp, enviar estado de cuenta, copiar estado, ticket y editar cliente.
- Estado de cuenta por WhatsApp/copiar con saldo, crédito, abonos, siguiente pago, abono sugerido y avance.
- Bitácora de seguimiento y promesas de pago por cliente.
- Ficha de cliente optimizada para celular: acciones y abono primero, métricas debajo.
- Panel principal optimizado: lo esencial visible primero y herramientas secundarias plegables.
- Artículos en lista móvil compacta con acciones visibles para editar, sumar/restar cantidad o eliminar.
- Panel visual del turno con siguiente cuenta, meta diaria e indicadores con iconos.
- Resumen de cobranza por método: efectivo, transferencia, depósito y otros.
- Rankings rápidos de clientes buenos, clientes de riesgo y clientes morosos.
- Corte del cobrador con efectivo a entregar y gastos del turno.
- Tickets imprimibles.
- Ticket o recordatorio por WhatsApp.
- Exportación CSV.
- Respaldo e importación JSON.

## Arranque local

```bash
npm start
```

Después abre:

```text
http://127.0.0.1:4173/
```

En Windows también puedes abrir:

```text
start-windows.bat
```

## Acceso demo

```text
PIN: 1234
```

Puedes cambiar el nombre del cobrador, teléfono, PIN y metas desde `Ajustes`.

## Backend/API

```text
GET  /api/health
GET  /api/db
PUT  /api/db
POST /api/upload/ine
POST /api/db/reset
GET  /api/db/export
```

La base se crea automáticamente en:

```text
data/cobranza-db.json
```

Ese archivo queda ignorado por Git para no subir datos reales.

Las fotos de INE se guardan en:

```text
uploads/ine/
```

La app guarda en el expediente la URL de la foto. La carpeta queda preparada para nube o servidor propio, pero las fotos reales se ignoran en GitHub por privacidad.

## Firebase Hosting / Nube

La app ya está preparada para Firebase sin cambiar la interfaz:

- Hosting sirve `index.html`, `styles.css`, `app.js` y `firebase-config.js`.
- Realtime Database guarda la cartera completa en `apps/carteraPrincipal`.
- Storage guarda las fotos de INE en la carpeta `ine/`.
- Firebase Auth con correo/contraseña protege el acceso.

Pasos:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

En Firebase Console activa:

```text
Authentication > Sign-in method > Email/Password
Realtime Database
Storage
```

Luego crea el usuario del cobrador en:

```text
Authentication > Users > Add user
```

Usa tu correo y una contraseña segura. No guardes la contraseña en GitHub.

Luego abre `firebase-config.js` y pega tu configuración Web de Firebase:

```text
Project settings > General > Your apps > Web app
```

Publica reglas y hosting:

```bash
firebase deploy
```

También puedes probar local con emuladores:

```bash
npm run firebase:emulators
```

Si `firebase-config.js` tiene valores `TU_...`, la app no activa Firebase y sigue usando backend local o respaldo local.

El login usa Firebase Auth con correo y contraseña:

```js
authMode: "password"
```

Si Firebase te da una URL distinta para Realtime Database, cambia esta línea en `firebase-config.js`:

```js
databaseURL: "https://novedadesmiry-b5366-default-rtdb.firebaseio.com"
```

## GitHub

GitHub debe guardar el código del sistema, no los datos privados. La cartera, abonos y fotos de INE se guardan en Firebase.

Sube estos archivos y carpetas:

```text
index.html
styles.css
app.js
server.js
package.json
.gitignore
README.md
ARCHITECTURE.md
start-windows.bat
firebase.json
firebase-config.js
database.rules.json
firestore.rules
storage.rules
.firebaserc.example
.firebaserc
.github/workflows/firebase-deploy.yml
data/.gitkeep
uploads/.gitkeep
uploads/ine/.gitkeep
```

GitHub Pages solo sirve archivos estáticos y no corre el backend Node. Para datos persistentes en nube, usa Firebase Hosting con Realtime Database y Storage.

No subas estos archivos reales:

```text
data/cobranza-db.json
uploads/ine/*
*.zip
```

Ya están ignorados en `.gitignore` para proteger clientes, saldos y fotos de INE.

## Deploy Automático desde GitHub

Incluye un workflow en:

```text
.github/workflows/firebase-deploy.yml
```

Para que GitHub publique a Firebase automáticamente al hacer push a `main`, crea este secreto en GitHub:

```text
Settings > Secrets and variables > Actions > New repository secret
Name: FIREBASE_SERVICE_ACCOUNT
Value: JSON de una cuenta de servicio de Firebase/Google Cloud
```

La cuenta de servicio debe tener permisos para Firebase Hosting, Realtime Database y Storage. Si no configuras ese secreto, puedes seguir haciendo deploy manual con:

```bash
firebase deploy
```
