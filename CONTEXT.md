# 🎶 Bardic Tunes - Contexto del Proyecto

## Descripción General
**Bardic Tunes** es un reproductor de música web estático diseñado para partidas de rol (RPG).
Permite cargar carpetas locales de música y reproducirlas con una interfaz temática de fantasía medieval.

---

## Tecnologías
- **HTML5** - Estructura semántica
- **CSS3** - Estilos con tema fantasía oscuro (variables CSS, flexbox, grid)
- **JavaScript Vanilla** - Sin frameworks, usando ES6+ classes
- **HTML5 Audio API** - Reproducción de audio
- **localStorage** - Persistencia de configuraciones

---

## Estructura de Archivos

```
ReproductorRol/
├── index.html              # Página principal
├── CONTEXT.md              # Este archivo de contexto
├── .github/
│   └── copilot-instructions.md  # Instrucciones para Copilot
├── css/
│   └── styles.css          # Estilos del tema fantasía oscuro
└── js/
    ├── app.js              # Controlador principal, conecta todos los módulos
    ├── player.js           # Clase AudioPlayer - maneja reproducción de audio
    ├── playlist.js         # Clase Playlist - gestión de cola y modos
    ├── fileExplorer.js     # Clase FileExplorer - árbol de carpetas navegable
    └── configManager.js    # Clase ConfigManager - carpetas guardadas y config
```

---

## Arquitectura de Clases

### 1. `AudioPlayer` (player.js)
Maneja la reproducción de audio usando HTML5 Audio API.

**Propiedades:**
- `audio` - Elemento Audio nativo
- `isPlaying` - Estado de reproducción
- `currentTrack` - Pista actual {file, name, folder, objectUrl}
- `volume` - Volumen (0-1)
- `isMuted` - Estado de silencio
- `isLooping` - Estado de loop

**Métodos principales:**
- `loadTrack(track)` - Carga una pista
- `play()` / `pause()` / `togglePlay()` / `stop()`
- `seek(time)` / `seekToPercent(percent)` / `skip(seconds)`
- `setVolume(value)` / `toggleMute()` / `toggleLoop()`
- `static formatTime(seconds)` - Formatea a mm:ss

**Callbacks:**
- `onTrackLoaded` - Cuando se cargan metadatos
- `onTimeUpdate` - Durante reproducción (para barra de progreso)
- `onTrackEnd` - Cuando termina una canción
- `onPlayStateChange` - Cambio play/pause

### 2. `Playlist` (playlist.js)
Gestiona la cola de reproducción y modos.

**Propiedades:**
- `tracks` - Array de pistas
- `currentIndex` - Índice actual
- `mode` - 'manual' | 'sequential' | 'shuffle'
- `shuffleOrder` - Orden aleatorio generado

**Métodos principales:**
- `addTracks(tracks, replace)` - Añade pistas (filtra duplicados si replace=false)
- `addTrack(track)` - Añade una pista individual
- `hasTrack(path)` - Comprueba si una pista existe
- `removeTrackByPath(path)` - Elimina pista por ruta
- `removeTracksByPaths(paths)` - Elimina múltiples pistas
- `setMode(mode)` - Cambia modo de reproducción
- `playTrack(index)` - Reproduce por índice
- `next()` / `previous()` - Navegación
- `onTrackEnded()` - Decide qué hacer al terminar canción

**Callbacks:**
- `onTrackChange` - Cambio de pista
- `onPlaylistUpdate` - Actualización de lista
- `onModeChange` - Cambio de modo

### 3. `FileExplorer` (fileExplorer.js)
Parsea y renderiza el árbol de carpetas con botones de acción.

**Propiedades:**
- `container` - Elemento DOM contenedor
- `files` - Array de archivos procesados
- `folderStructure` - Estructura jerárquica de carpetas
- `supportedFormats` - ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac', '.webm']
- `checkInPlaylist` - Función para verificar si track está en playlist

**Métodos principales:**
- `processFiles(fileList)` - Procesa FileList del input
- `render()` - Renderiza el árbol HTML con botones ➕/➖
- `selectFile(filePath)` - Selecciona archivo
- `setPlayingFile(filePath)` - Marca archivo como reproduciéndose
- `getFilesFromFolder(folderPath)` - Obtiene archivos de una carpeta
- `expandAll()` / `collapseAll()` - Control de carpetas

**Callbacks:**
- `onFileSelect` - Click/doble-click en archivo
- `onFilesLoaded` - Archivos cargados (NO añade a playlist automáticamente)
- `onAddTrack` - Botón ➕ en archivo individual
- `onRemoveTrack` - Botón ➖ en archivo individual
- `onAddFolder` - Botón ➕ en carpeta (añade todos los archivos)
- `onRemoveFolder` - Botón ➖ en carpeta (quita todos los archivos)

### 4. `ConfigManager` (configManager.js)
Gestiona carpetas guardadas y configuración persistente.

**Propiedades:**
- `savedFolders` - Array de carpetas favoritas
- `config` - Configuración general (volumen, modo, etc.)

**Métodos principales:**
- `saveFolder(name, path, fileCount)` - Guarda carpeta en favoritos
- `removeFolder(id)` - Elimina carpeta de favoritos
- `renameFolder(id, newName)` - Renombra carpeta guardada
- `getSavedFolders()` - Obtiene lista de carpetas guardadas
- `setLastFolder(path)` - Guarda última carpeta cargada
- `exportConfig()` / `importConfig(json)` - Exportar/importar configuración

**Callbacks:**
- `onFoldersUpdate` - Cuando se actualizan las carpetas guardadas

### 5. `app.js` (Controlador Principal)
Conecta todos los módulos y maneja eventos de UI.

**Responsabilidades:**
- Inicialización de módulos
- Event listeners de botones y controles
- Atajos de teclado
- Actualización de UI (playlist visual, iconos)
- Carga de configuraciones de localStorage

---

## Funcionalidades Implementadas

### ✅ Core
- [x] Carga de carpetas locales (webkitdirectory)
- [x] Drag & drop de archivos
- [x] Árbol de carpetas expandible/colapsable
- [x] Reproducción de audio (play/pause/stop)
- [x] Barra de progreso con seek (click y arrastre)
- [x] Tiempo actual y duración (formato mm:ss)
- [x] Botones anterior/siguiente

### ✅ Gestión de Playlist
- [x] Añadir canciones individuales (➕)
- [x] Añadir carpetas completas (➕)
- [x] Quitar canciones individuales (➖)
- [x] Quitar carpetas completas (➖)
- [x] Limpiar playlist completa
- [x] Indicador visual de canciones en playlist (✅)
- [x] Botón quitar en cada item de la playlist

### ✅ Controles Avanzados
- [x] Control de volumen (slider)
- [x] Botón mute
- [x] Modo loop (repetir canción)
- [x] Modo shuffle (aleatorio)
- [x] Selector de modo: Manual / Secuencial / Aleatorio

### ✅ Persistencia (localStorage)
- [x] Volumen guardado
- [x] Estado de mute
- [x] Modo de reproducción
- [x] Estado de loop
- [x] Carpetas guardadas/favoritas
- [x] Última carpeta cargada

### ✅ Atajos de Teclado
| Tecla | Acción |
|-------|--------|
| Espacio | Play/Pause |
| ← | Retroceder 5 segundos |
| → | Avanzar 5 segundos |
| ↑ | Subir volumen 10% |
| ↓ | Bajar volumen 10% |
| M | Silenciar/Desilenciar |
| N | Siguiente canción |
| P | Anterior canción |

---

## Tema Visual: Fantasía Oscura

### Paleta de Colores (Variables CSS)
```css
--bg-darkest: #0d0d0f;      /* Fondo principal */
--bg-dark: #1a1a1f;         /* Paneles */
--bg-medium: #252530;       /* Headers */
--gold: #c9a227;            /* Acento principal */
--gold-light: #e8c547;      /* Hover/activo */
--magic-purple: #6b4c9a;    /* Botones activos */
--text-primary: #e8e6e3;    /* Texto principal */
--text-secondary: #a8a5a0;  /* Texto secundario */
```

### Tipografías
- **Títulos:** Cinzel (Google Fonts) - Estilo medieval
- **Cuerpo:** Crimson Text (Google Fonts) - Legible

### Efectos Visuales
- Textura de ruido sutil en fondo
- Gradientes dorados en barra de progreso
- Animación shimmer en progreso
- Animación float en iconos del header
- Animación wave en indicador de reproducción

---

## Ideas para Futuras Mejoras

### 🎯 Prioridad Alta
- [ ] Fade/crossfade entre canciones
- [ ] Búsqueda de canciones
- [ ] Detección de categorías por nombre de carpeta (Combate, Taberna, etc.)

### 🎯 Prioridad Media
- [ ] Guardar última canción y posición para reanudar
- [ ] Ecualizador visual (canvas con frecuencias)
- [ ] Temas alternativos (cyberpunk, horror, etc.)
- [ ] Exportar/importar playlists (JSON)

### 🎯 Prioridad Baja
- [ ] Edición de metadatos de canciones
- [ ] Notas por canción (para recordar cuándo usarla)
- [ ] Modo "Ambiente" con loops infinitos
- [ ] Integración con servicios de streaming (requeriría backend)

---

## Limitaciones Conocidas

1. **Acceso a archivos:** Por seguridad del navegador, el usuario debe seleccionar manualmente la carpeta de música.
2. **webkitdirectory:** Funciona en Chrome, Edge, Firefox. Safari tiene soporte limitado.
3. **Formatos de audio:** Depende del soporte del navegador (MP3 universal, OGG/FLAC variable).
4. **Sin backend:** No puede escanear carpetas automáticamente ni sincronizar entre dispositivos.

---

## Cómo Ejecutar

1. Abrir `index.html` en un navegador moderno
2. Clic en "Cargar Música" y seleccionar carpeta con archivos de audio
3. Navegar por el árbol y hacer doble clic en una canción para reproducir
4. Usar controles o atajos de teclado

**Recomendado:** Usar Live Server de VS Code para evitar restricciones CORS en algunos navegadores.

---

*Última actualización: 20 de diciembre de 2025*
