# 🎶 Bardic Tunes

<div align="center">
  <h3>Reproductor de música web para partidas de rol</h3>
  <p>Una aplicación minimalista con temática de fantasía oscura para gestionar la ambientación musical de tus sesiones de RPG</p>
</div>

---

## ✨ Características

- 🎵 **Reproducción local**: Carga carpetas de música desde tu ordenador
- 📂 **Explorador de archivos**: Navega por tu biblioteca con un árbol de carpetas expandible
- 🎛️ **Controles completos**: Play, pause, siguiente, anterior, búsqueda en la pista
- 🔀 **Modos de reproducción**: Manual, secuencial o aleatorio
- 🎚️ **Control de volumen**: Slider de volumen con botón de mute
- 🔁 **Modo loop**: Repite tu canción favorita indefinidamente
- 📋 **Playlist drag & drop**: Reordena canciones arrastrándolas
- ⚙️ **Persistencia**: Guarda tus preferencias (volumen, modo, etc.) automáticamente
- ⌨️ **Atajos de teclado**: Control rápido sin usar el ratón
- 🎨 **Tema fantasía oscura**: Interfaz inmersiva inspirada en ambientes medievales

---

## 🚀 Inicio Rápido

### Requisitos previos
- [Node.js](https://nodejs.org/) (v14 o superior)

### Instalación

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/Juandeodin/ReproductorRol.git
   cd ReproductorRol
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Inicia el servidor**
   ```bash
   npm start
   ```

4. **Abre tu navegador**
   ```
   http://localhost:3000
   ```

---

## 📖 Uso

### Carga de música

Tienes tres opciones para cargar música:

1. **Botón "Cargar Carpeta"**: Selecciona una carpeta de tu ordenador
2. **Drag & Drop**: Arrastra archivos directamente a la ventana
3. **Pre-configuración**: Edita `config.js` para cargar carpetas automáticamente al iniciar

#### Configuración automática de carpetas

Edita el archivo [config.js](config.js) para que cargue tus carpetas favoritas:

```javascript
const MUSIC_CONFIG = {
    autoLoad: true,  // Carga automática al iniciar
    folders: [
        { 
            name: "Bandas Sonoras", 
            path: "music/soundtracks"
        },
        { 
            name: "Ambiente Medieval", 
            path: "music/medieval"
        }
    ]
};
```

### Atajos de teclado

| Tecla | Acción |
|-------|--------|
| <kbd>Espacio</kbd> | Play / Pause |
| <kbd>←</kbd> | Retroceder 5 segundos |
| <kbd>→</kbd> | Avanzar 5 segundos |
| <kbd>↑</kbd> | Subir volumen 10% |
| <kbd>↓</kbd> | Bajar volumen 10% |
| <kbd>M</kbd> | Silenciar / Desilenciar |
| <kbd>N</kbd> | Siguiente canción |
| <kbd>P</kbd> | Anterior canción |

### Modos de reproducción

- **🎯 Manual**: Solo reproduce la canción seleccionada, no avanza automáticamente
- **📜 Secuencial**: Reproduce las canciones en orden, una tras otra
- **🔀 Aleatorio**: Reproduce las canciones en orden aleatorio

---

## 🛠️ Tecnologías

- **HTML5** - Estructura semántica
- **CSS3** - Estilos con variables CSS, Flexbox y Grid
- **JavaScript Vanilla** - Sin frameworks, usando clases ES6+
- **HTML5 Audio API** - Para la reproducción de audio
- **localStorage** - Persistencia de configuraciones
- **Node.js + Express** - Servidor web local

---

## 📁 Estructura del Proyecto

```
ReproductorRol/
├── index.html              # Página principal
├── config.js               # Configuración de carpetas
├── server.js               # Servidor Express
├── CONTEXT.md              # Documentación técnica completa
├── .github/
│   └── copilot-instructions.md
├── css/
│   └── styles.css          # Estilos tema fantasía oscura
├── js/
│   ├── app.js              # Controlador principal
│   ├── player.js           # Clase AudioPlayer
│   ├── playlist.js         # Clase Playlist
│   ├── fileExplorer.js     # Clase FileExplorer
│   └── configManager.js    # Clase ConfigManager
└── music/                  # Carpeta para tu música
```

---

## 🎨 Tema Visual

Interfaz inspirada en la fantasía medieval oscura:

- **Paleta de colores**: Tonos oscuros con acentos dorados
- **Tipografía**: Cinzel para títulos (estilo medieval)
- **Iconos personalizados**: Botones con símbolos temáticos
- **Animaciones sutiles**: Transiciones suaves para una experiencia inmersiva

---

## 🎯 Formatos soportados

- MP3 (`.mp3`)
- OGG (`.ogg`)
- WAV (`.wav`)
- FLAC (`.flac`)
- AAC (`.aac`, `.m4a`)
- WebM Audio (`.webm`)

---

## 📝 Documentación

Para información técnica detallada sobre la arquitectura, clases y funcionalidades, consulta [CONTEXT.md](CONTEXT.md).

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz un fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 👤 Autor

**Juandeodin**
- GitHub: [@Juandeodin](https://github.com/Juandeodin)

---

<div align="center">
  <p>Hecho con ❤️ para jugadores de rol</p>
  <p>🎲 ¡Que la música acompañe tus aventuras! 🎲</p>
</div>
