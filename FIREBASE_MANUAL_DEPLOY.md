# Deploy manual a Firebase

Este archivo es para cuando subes el proyecto a GitHub desde la pagina web y no puedes subir carpetas ocultas como `.github` o archivos como `.firebaserc`.

## Subir a GitHub desde navegador

Puedes subir solo estos archivos:

```text
index.html
styles.css
app.js
server.js
package.json
README.md
ARCHITECTURE.md
SECURITY.md
GITHUB_UPLOAD.md
FIREBASE_MANUAL_DEPLOY.md
firebase.json
firebase-config.js
database.rules.json
firestore.rules
storage.rules
start-windows.bat
```

No necesitas subir:

```text
.github/
.firebaserc
data/
uploads/
```

## Publicar Firebase manualmente

Desde tu PC, dentro de la carpeta del proyecto:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --project novedadesmiry-b5366
```

## Reglas Realtime Database

Si las vas a pegar manualmente en Firebase Console, usa:

```json
{
  "rules": {
    "apps": {
      "$appId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## Importante

El acceso se hace con Firebase Authentication usando correo y contraseña.

Los datos reales se guardan en Firebase, no en GitHub:

- Realtime Database: clientes, abonos, saldos y articulos.
- Storage: fotos de INE.
