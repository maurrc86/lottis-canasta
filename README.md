# Escuela de Canasta Ale y Mau

## Lo importante es convivir.

Una aplicación web educativa e interactiva para aprender a jugar canasta desde cero, pensada para TJ, Euge, Eli y Paloma antes de un fin de semana de juego con Ale y Mau.

Este documento está escrito para alguien **sin experiencia técnica**. Sigue los pasos en orden y no necesitas saber programar.

---

## 1. Qué es este proyecto

Es una escuela interactiva en tu navegador con:

- 17 módulos cortos que enseñan las reglas de la mesa de Ale y Mau, paso a paso.
- Ejercicios, mini-juegos y una simulación completa de una mano.
- Una sección de **consulta rápida** ("Estamos jugando") para resolver dudas durante una partida real.
- Una **calculadora de puntuación** y una **calculadora de apertura**.
- Un **examen final** de al menos 20 preguntas.
- Un **certificado personalizado** para imprimir o guardar como PDF al aprobar.
- Guarda automáticamente tu progreso en tu propio dispositivo (no usa internet ni servidores).

No necesita instalación, no tiene anuncios, no usa bases de datos ni claves de API, y funciona sin conexión a internet una vez que la página cargó por primera vez.

## 2. Qué archivos incluye

```
escuela-canasta-ale-y-mau/
├── index.html      → La estructura de toda la aplicación
├── styles.css       → El diseño visual (mesa de fieltro, dorado, crema)
├── app.js           → Toda la lógica: lecciones, ejercicios, examen, calculadoras
├── manifest.json     → Permite "instalar" la app como acceso directo
├── favicon.svg       → El ícono de la aplicación
└── README.md         → Este archivo
```

Los cinco primeros archivos son necesarios para que la aplicación funcione. Todos deben estar en la **misma carpeta**.

## 3. Cómo probarlo en tu computadora (sin subir nada a internet)

1. Descarga o copia los 5 archivos anteriores en una misma carpeta de tu computadora.
2. Busca el archivo `index.html` en esa carpeta.
3. Haz doble clic sobre él. Se abrirá en tu navegador (Chrome, Safari, etc.) y la aplicación funcionará de inmediato.
4. Puedes cerrar y volver a abrir el archivo cuando quieras: tu progreso se guarda en ese navegador y en esa computadora.

## 4. Cómo subirlo a GitHub (paso a paso, sin experiencia previa)

1. Crea una cuenta gratuita en [github.com](https://github.com) si todavía no tienes una.
2. En la esquina superior derecha, haz clic en el botón **"+"** y elige **"New repository"** (Nuevo repositorio).
3. Ponle un nombre, por ejemplo `escuela-canasta-ale-y-mau`.
4. Déjalo como **público** (Public) para poder usar GitHub Pages gratis.
5. Haz clic en **"Create repository"**.
6. En la página que aparece, busca el enlace que dice **"uploading an existing file"** (subir un archivo existente).
7. Arrastra los 5 archivos (`index.html`, `styles.css`, `app.js`, `manifest.json`, `favicon.svg`) directamente a esa página. También puedes arrastrar este `README.md`.
8. Baja hasta el final de la página y haz clic en **"Commit changes"** (Guardar cambios).

## 5. Cómo activar GitHub Pages

1. Dentro de tu repositorio en GitHub, haz clic en la pestaña **"Settings"** (Configuración), arriba a la derecha.
2. En el menú de la izquierda, busca y haz clic en **"Pages"**.
3. En la sección **"Build and deployment"**, donde dice **"Branch"**, elige la rama **`main`**.
4. En la carpeta, elige **`/root`** (la raíz del proyecto, no una subcarpeta).
5. Haz clic en **"Save"** (Guardar).
6. Espera uno o dos minutos. Actualiza la página y aparecerá un enlace como:
   `https://tu-usuario.github.io/escuela-canasta-ale-y-mau/`
7. Abre ese enlace desde cualquier teléfono o computadora: ¡tu escuela de canasta ya está en línea!

**Importante:** la rama debe llamarse `main` y GitHub Pages debe desplegar desde la raíz (`/root`), tal como se indica arriba. Si tu repositorio usa otra rama por defecto, cámbiala a `main` en la configuración del repositorio antes de activar Pages.

## 6. Cómo actualizar el sitio en el futuro

1. Entra a tu repositorio en GitHub.
2. Haz clic sobre el archivo que quieres cambiar (por ejemplo, `app.js`).
3. Haz clic en el ícono del lápiz (✏️) para editarlo, o usa "Upload files" para reemplazarlo por una versión nueva desde tu computadora.
4. Haz clic en **"Commit changes"** para guardar.
5. GitHub Pages actualizará el sitio automáticamente en uno o dos minutos.

## 7. Cómo cambiar nombres o reglas en el futuro

- **Para cambiar los nombres de los jugadores** (TJ, Euge, Eli, Paloma): abre `app.js`, busca cerca del inicio del archivo la línea que dice `var NAMES = ['TJ', 'Euge', 'Eli', 'Paloma'];` y cambia los nombres entre comillas.
- **Para cambiar el texto de bienvenida**: abre `index.html` y busca la sección `<section id="screen-welcome"`. El texto está ahí, dentro de etiquetas `<p>`.
- **Para cambiar el contenido de un módulo**: en `app.js`, busca el comentario `MÓDULO` seguido del número que quieras cambiar (por ejemplo, `MÓDULO 7`) y edita el texto dentro de las comillas.
- **Para cambiar los colores**: abre `styles.css` y modifica los valores dentro de `:root { ... }` al principio del archivo (por ejemplo, `--felt-900` es el verde oscuro de la mesa, `--gold` es el dorado).

Guarda los cambios, súbelos a GitHub siguiendo el paso 6, y listo.

## 8. Cómo reiniciar el progreso guardado

- **Desde la aplicación:** entra al menú principal y busca el botón **"Reiniciar progreso"** al final de la pantalla. Te pedirá confirmación antes de borrar todo.
- **Manualmente, desde el navegador:** abre las herramientas de desarrollador de tu navegador, ve a la pestaña "Application" o "Almacenamiento", busca "Local Storage" y elimina la entrada llamada `aleymau_canasta_progreso_v1`.

## Nota sobre las reglas

Esta escuela utiliza las reglas de la mesa de Ale y Mau. Algunas variantes de canasta pueden jugarse de manera diferente en otras mesas o regiones.

---

Hecho con cariño para TJ, Euge, Eli y Paloma. Nos vemos en la mesa. 🂡🂱🃁🃑

**Lo importante es convivir.**
