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
 * TIPOS DE RUTAS SOPORTADAS:
 * 
 * 1. RUTAS RELATIVAS (dentro del proyecto):
 *    'music/ROL'
 *    'music/Combate'
 * 
 * 2. RUTAS ABSOLUTAS (cualquier carpeta del ordenador):
 *    Windows:  'C:/Musica/Rol' o 'C:\\Musica\\Rol'
 *    Linux/Mac: '/home/usuario/Musica/Rol'
 * 
 * EJEMPLOS:
 * folders: [
 *     'music/ROL',                           // Relativa al proyecto
 *     'C:/Users/TuNombre/Music/RPG',         // Windows absoluta
 *     'D:/Mi Colección de Música/Fantasía'  // Con espacios
 * ]
 * 
 * El servidor escaneará automáticamente TODAS las subcarpetas
 * y archivos de audio en cada ruta configurada.
 */

const MUSIC_CONFIG = {
    // ============================================
    // CARPETAS DE MÚSICA
    // ============================================
    
    folders: [
        'S:/Musica'
        // 'C:/Users/TuNombre/Music/RPG',
        // 'D:/Música/Fantasía',
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
