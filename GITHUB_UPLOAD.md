# Subir a GitHub

Este proyecto esta listo para subirse a GitHub como codigo fuente.

## 1. Que subir

Sube todos los archivos del ZIP `novedades-muebles-miry-github-ready.zip`.

Incluye:

- Frontend: `index.html`, `styles.css`, `app.js`
- Backend local opcional: `server.js`
- Firebase: `firebase.json`, `firebase-config.js`, `database.rules.json`, `storage.rules`, `firestore.rules`, `.firebaserc`
- Documentacion: `README.md`, `ARCHITECTURE.md`, `SECURITY.md`
- Deploy automatico: `.github/workflows/firebase-deploy.yml`

## 2. Que NO subir

No subas datos reales:

- `data/cobranza-db.json`
- `uploads/ine/*`
- fotos de INE
- respaldos JSON reales
- archivos `.zip`

Ya estan protegidos por `.gitignore`.

## 3. Comandos para subir

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Primera version de Novedades y Muebles Miry"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

## 4. Firebase

Antes de usar la app en Firebase, activa en Firebase Console:

```text
Authentication > Email/Password
Realtime Database
Storage
```

Despues crea el usuario en `Authentication > Users > Add user`.

Reglas de Realtime Database:

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

Deploy manual:

```bash
firebase login
firebase deploy
```

## 5. Deploy automatico desde GitHub

El workflow ya esta en:

```text
.github/workflows/firebase-deploy.yml
```

Para activarlo, crea un secret en GitHub:

```text
FIREBASE_SERVICE_ACCOUNT
```

Si no configuras ese secret, no pasa nada: usa deploy manual con `firebase deploy`.
