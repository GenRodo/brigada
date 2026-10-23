# Brigada

Herramientas digitales para restaurantes. Proyecto limpio: solo la estructura, sin datos de ningún local ni trabajador.

## Estructura

```
brigada/
├── index.html          Sitio de venta (portada)
├── assets/
│   └── brigada.css     Estilos compartidos (colores, tipografía, botones, tablas)
├── carta/
│   ├── index.html      La Carta: menú, horario, reservas, ubicación y contacto, reseñas
│   └── datos.js        Datos del local (vacío). Aquí se completa cada carta
└── portal/
    ├── index.html      Portal de trabajadores
    └── app.js          Lógica del portal
```

## La Carta

- Se completa editando `carta/datos.js`. Lo que queda vacío se oculta o muestra un aviso.
- Varios locales: copia el bloque del local dentro de `locales` y cambia el `id`.
- Link de cada local (para su QR): `carta/index.html?local=ID`.
- Las reservas se envían al WhatsApp del local con un mensaje ya escrito.

## Portal de trabajadores

Sesiones por PIN:

| Módulo                       | Administrador | Supervisor          | Trabajador        |
|------------------------------|---------------|---------------------|-------------------|
| Horario mensual              | Crea y edita  | Edita               | Ve el suyo        |
| Asistencia y horas extra     | Todo          | Revisa y aprueba    | Marca y justifica |
| Licencias, permisos, vacac.  | Todo          | Registra            | —                 |
| Anticipos                    | Todo          | Registra y autoriza | Ve los suyos      |
| Consumo del personal         | Todo          | Registra            | Ve los suyos      |
| Cierre de mes                | Ve y descarga | Ve y descarga       | —                 |
| Trabajadores y PIN           | Gestiona      | —                   | —                 |
| Configuración y respaldo     | Gestiona      | —                   | —                 |

- **Primer uso:** pide nombre del local y PIN de administrador.
- **Orden recomendado:** Configuración (turnos y feriados), luego Trabajadores y después Horario.
- **Marcar asistencia:** en la pantalla de inicio, el trabajador ingresa su PIN. La primera marca del día es la entrada; la siguiente, la salida.
- **Informes Excel:** cada sección tiene "Descargar Excel". El cierre de mes descarga un libro con 6 hojas: cierre, asistencia, anticipos, consumo, licencias y horario.
- **Datos:** se guardan en el navegador del equipo del local (localStorage). Hay que usar siempre el mismo computador o tablet.
- **Respaldo:** en Configuración → "Descargar respaldo" (archivo .json). Con "Restaurar respaldo" se cargan los datos en otro equipo.

### Reglas del cierre

- Full time: días a liquidar = 30 − licencias − permisos sin goce. Las vacaciones se pagan normal.
- Part time: horas trabajadas (brutas, de entrada a salida).
- Horas extra: solo cuentan las aprobadas por un supervisor o el administrador.
- Fallas: días con turno, sin marca y sin licencia o permiso, contados hasta ayer.
- Días libres trabajados y feriados trabajados se informan aparte.
- Topes de anticipo y descuento de consumo se configuran por local. Si un anticipo pasa el tope o es el segundo del mes, se exige "Autorizado por supervisor".

## Publicar en GitHub Pages

1. Crea un repositorio nuevo llamado `brigada`.
2. Sube todo el contenido de esta carpeta, respetando las subcarpetas.
3. Ve a Settings → Pages → Branch: `main` / `(root)` → Save.
4. Queda en `https://TU-USUARIO.github.io/brigada/`.

Para probar en tu computador, abre la carpeta en VS Code y usa **Open with Live Server** sobre `index.html`.
