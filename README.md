# Ruta Escolar — primera versión funcional

Prototipo PWA en español para gestionar alumnos, apoderados, horarios y nóminas de transporte escolar.

## Incluye
- Registro y edición de alumnos, curso, dirección, apoderado, teléfono y días de servicio.
- Importación de contactos: selector nativo en navegadores compatibles y archivo vCard (.vcf), útil en iPhone.
- Horarios configurables de ingreso y salida.
- Nóminas diarias por horario y marcas de retiro/entrega guardadas localmente.
- Mensaje predefinido con enlace a WhatsApp para revisión y envío manual.
- Datos ficticios de ejemplo, exportación e importación JSON.
- Diseño adaptable y caché de archivos para abrir la interfaz sin conexión después de la primera carga.

## Ejecutar en computador
Requiere Python 3 instalado. Desde esta carpeta:

```bash
python3 -m http.server 8080
```

Abrir `http://localhost:8080` en el navegador.

## Importar contactos del teléfono
- En navegadores compatibles, “Elegir del teléfono” abre el selector de contactos del dispositivo (requiere contexto seguro HTTPS y compatibilidad del navegador).
- En iPhone/Safari, donde el selector web no está disponible, exporta o comparte el contacto desde Contactos como archivo vCard (.vcf), luego usa “Importar contacto (.vcf)”.
- La app solo importa el nombre y el primer teléfono detectado; revisa los datos antes de guardar. No carga toda la agenda automáticamente.

## Probar en Android o iPhone
Para instalar una PWA en un teléfono, publicar esta carpeta en un alojamiento HTTPS. En Android, abrir el sitio en Chrome y elegir “Instalar aplicación” o “Añadir a pantalla de inicio”. En iPhone, abrir en Safari, pulsar Compartir y “Añadir a pantalla de inicio”. Para pruebas en red local, se puede usar un servidor HTTPS de desarrollo.

## Cambios de interfaz móvil
Se reforzaron los estilos para pantallas estrechas, áreas seguras de iPhone, controles táctiles, tamaño de letra de campos para evitar zoom automático de iOS y navegación inferior.

## Alcance y limitaciones importantes
Esta versión guarda la información en el navegador del dispositivo. **Todavía no hay backend, cuentas de conductor/ayudantes, sincronización entre teléfonos, optimización real de rutas ni envío automático de WhatsApp.** La caché PWA conserva los archivos de interfaz, y los datos se guardan en almacenamiento local; el primer acceso necesita conexión para descargar los archivos si no se aloja y precarga previamente.

Antes de usar con datos reales de menores, implementar servidor HTTPS, autenticación, permisos por rol, cifrado y respaldos, políticas de retención y consentimiento para tratamiento de datos personales. Las operaciones sin conexión deben sincronizarse con identificadores idempotentes y reglas explícitas de resolución de conflictos.


## Horarios de salida por alumno y día
Cada ficha permite definir una hora habitual de salida y, opcionalmente, una hora especial para cada día de lunes a viernes. Las nóminas de salida filtran por la hora efectiva de ese día. Los registros antiguos siguen usando el horario habitual si no tienen excepciones.

## Mensaje de llegada al colegio
En Nóminas de ruta, pulsa **Mensaje llegada al colegio** para preparar mensajes de WhatsApp para los alumnos marcados como retirados en casa ese día. Por las limitaciones de WhatsApp desde una PWA, cada chat se abre con el texto preparado y el usuario debe confirmar el envío en WhatsApp. Usa **Abrir siguiente mensaje** para procesar la lista uno a uno.


## Retiro desde casa (v7)
En Inicio, pulsa **Iniciar retiro desde casa**. La app abre la nómina de la ruta de mañana, organizada según el orden manual configurado, con casillas para marcar a cada alumno retirado. También está disponible el acceso desde Nóminas de ruta.


## Cambios v9
- Las marcas de retiro/entrega se guardan con la **fecha real**; cada semana la lista parte limpia. Los registros antiguos sin fecha se descartan al abrir.
- Cursos de media corregidos (1° a 4° Medio); las fichas con 9°–12° Medio se convierten solas.
- Teléfonos chilenos normalizados (`9 1234 5678`, `09…`, `56…`, `+56…` → `+56 9 1234 5678`) al guardar, importar y enviar. Si el número no sirve para WhatsApp se avisa.
- Service worker "red primero": con internet siempre carga la versión nueva; sin internet usa la copia guardada.
- Íconos PNG (192, 512 y apple-touch-icon) para instalar en iPhone y Android.

## Cambios v10
- **Archivo mensual en PDF.** Los registros de retiro/entrega se pueden guardar por mes como `AAAAMM.pdf` (ej. `202610.pdf`) desde *Más → Archivo mensual*. Al terminar un mes aparece un aviso en Inicio. Nada se borra sin confirmación: primero se genera el PDF, y solo si confirmas que lo guardaste, esos registros se quitan de la app. El PDF se genera dentro de la app (sin conexión). En iPhone abre la hoja *Compartir* → *Guardar en Archivos*.
- Cada registro guarda ahora nombre, curso y apoderado del alumno, de modo que el PDF sigue siendo legible aunque después se borre la ficha.
- **Cursos:** se agregan Pre-Kinder y Kinder. En *Más → Cursos disponibles* se puede deshabilitar cualquier curso (deja de aparecer al registrar alumnos; los ya registrados no cambian).

## Instalar en el teléfono (sin abrir archivos)
La app no se instala desde un archivo: se publica en una dirección https y se abre desde el navegador del teléfono. Opciones gratuitas:

**GitHub Pages**
1. Crear cuenta en github.com y un repositorio nuevo (ej. `ruta-escolar`).
2. *Add file → Upload files* y subir **el contenido** de la carpeta (index.html, app.js, styles.css, sw.js, manifest.webmanifest, íconos).
3. *Settings → Pages →* Branch `main`, carpeta `/ (root)` → Save.
4. A los 1–2 minutos queda en `https://TU-USUARIO.github.io/ruta-escolar/`.
Nota: en cuentas gratuitas el repositorio es público (el código se puede ver; los datos de alumnos **no**, porque viven solo en el teléfono).

**Cloudflare Pages** (permite repositorio privado): *Workers & Pages → Create → Pages → Upload assets*, subir la carpeta.

Luego:
- **iPhone:** abrir la dirección en **Safari** → Compartir → **Añadir a pantalla de inicio**.
- **Android:** abrir en **Chrome** → menú ⋮ → **Instalar aplicación**.

Los datos viven en el teléfono donde se instaló. Usar *Configuración → Exportar datos* como respaldo.

## Cambios V2.0
- **Funciona sin internet.** Al instalarla, la app se guarda completa en el teléfono y abre siempre desde la copia local. Solo usa internet para buscar versiones nuevas.
- **Botón de actualización** (*Más → Versión y actualizaciones*): "Buscar actualizaciones" y, si hay una nueva, "Actualizar ahora". No se actualiza sola a mitad de una ruta. Los alumnos y registros no se tocan.
- **Autorización por teléfono.** Cada teléfono muestra un código de dispositivo; solo el propietario puede generar el código de activación que lo desbloquea (ver `HERRAMIENTAS-PROPIETARIO`). Un código no sirve en otro teléfono.
- Numeración de versiones: V1.9 corresponde al paquete anterior (antes llamado v10); este es V2.0.

## Cambios V2.1
- **Corrección sin internet:** antes, si faltaba un solo archivo en la publicación (por ejemplo un ícono), el teléfono no guardaba la app y no abría en modo avión. Ahora solo los archivos imprescindibles (`index.html`, `styles.css`, `app.js`, `licencia.js`) bloquean la instalación; los íconos y el manifiesto son secundarios.
- **Diagnóstico** en *Más → Versión y actualizaciones → Diagnóstico: ¿funciona sin internet?* (también en la pantalla de bloqueo): indica si el service worker está activo y qué archivos se guardaron.
- Si falta `licencia.js`, la app queda bloqueada con un aviso claro, en lugar de funcionar sin protección.

## Cambios V2.2
- **Hasta 4 apoderados por alumno** (nombre, teléfono y parentesco opcional). El primero es obligatorio; la ficha nueva muestra dos por defecto. Cada apoderado tiene su propio "Elegir del teléfono" / "Importar .vcf" y su propio botón de llamada. Los alumnos antiguos con un solo apoderado se convierten solos.
- **Mensaje de llegada al colegio:** al pulsar el botón se abre una lista con los alumnos retirados en casa y, bajo cada uno, sus apoderados con un botón **Enviar**. Cada botón abre WhatsApp con el mensaje listo; el envío final se confirma en WhatsApp. La fila queda marcada con la hora ("WhatsApp abierto a las 08:00") y el botón pasa a "Abrir de nuevo". La lista se mantiene al volver desde WhatsApp.
- El texto del mensaje se puede editar (desplegable al final de la lista; `[ALUMNO]` se reemplaza por el nombre).
- Los avisos quedan en el registro y aparecen en el PDF mensual.
- La pestaña *Mensajes* permite elegir a qué apoderado enviar.
