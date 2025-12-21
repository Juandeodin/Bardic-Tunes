/**
 * ============================================
 * CONFIGURACIÓN DE BARDIC TUNES
 * ============================================
 * 
 * Aquí puedes definir las carpetas de música que se precargarán
 * automáticamente al iniciar la aplicación.
 * 
 * REQUISITOS:
 * 1. Ejecutar el servidor: npm start
 * 2. Abrir en navegador: http://localhost:3000
 * 
 * ESTRUCTURA:
 * ReproductorRol/
 * ├── music/
 * │   ├── Combate/
 * │   │   ├── batalla_epica.mp3
 * │   │   └── tension.mp3
 * │   └── Taberna/
 * │       └── musica_alegre.mp3
 * ├── config.js    <- Este archivo
 * └── server.js    <- Servidor Node.js
 * 
 * El servidor escaneará automáticamente las carpetas que configures
 * aquí abajo - ¡sin necesidad de crear ningún index.json!
 */

const MUSIC_CONFIG = {
    // ============================================
    // CARPETAS DE MÚSICA
    // ============================================
    // Añade las rutas relativas a tus carpetas de música
    // El servidor escaneará automáticamente los archivos de audio
    
    folders: [
        'music/ROL',
    ],
    
    // ============================================
    // CONFIGURACIÓN GENERAL
    // ============================================
    
    settings: {
        // Volumen inicial (0.0 a 1.0)
        defaultVolume: 0.8,
        
        // Modo de reproducción inicial: 'manual', 'sequential', 'shuffle'
        defaultMode: 'manual',
        
        // Formatos de audio soportados
        supportedFormats: ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac', '.webm'],
    }
};

// No modificar esta línea
window.MUSIC_CONFIG = MUSIC_CONFIG;
