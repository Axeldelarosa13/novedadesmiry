# Seguridad y datos privados

Este repositorio debe guardar codigo, configuracion publica de Firebase y reglas.

No subas datos reales de clientes:

- `data/cobranza-db.json`
- `uploads/ine/*`
- respaldos JSON con cartera real
- fotos de INE
- tickets o CSV con telefonos, direcciones o saldos

La informacion operativa se guarda en Firebase:

- Realtime Database: cartera, abonos, articulos y bitacora.
- Storage: fotos de INE.

El acceso debe manejarse con Firebase Authentication usando correo y contraseña. No guardes contraseñas en archivos del repositorio.

Antes de publicar el repositorio, revisa que `.gitignore` siga excluyendo datos y archivos privados.
