/**
 * Servidor Express para Bardic Tunes
 * Permite escanear carpetas de música y servir archivos estáticos
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Formatos de audio soportados
const SUPPORTED_FORMATS = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac', '.webm'];

// Mapa de carpetas absolutas configuradas (se cargan desde config.js)
const absoluteFoldersMap = new Map();

// Servir archivos estáticos (HTML, CSS, JS, música del proyecto)
app.use(express.static('.'));

// Middleware para servir archivos de carpetas absolutas
app.use('/absolute-music', (req, res, next) => {
    const urlPath = decodeURIComponent(req.path);
    
    // Buscar en el mapa de carpetas absolutas
    for (const [alias, absolutePath] of absoluteFoldersMap.entries()) {
        if (urlPath.startsWith('/' + alias)) {
            const relativePath = urlPath.slice(alias.length + 2); // +2 para quitar /alias/
            const filePath = path.join(absolutePath, relativePath);
            
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                return res.sendFile(filePath);
            }
        }
    }
    next();
});

/**
 * API: Obtener lista de archivos de una carpeta (recursivo)
 * GET /api/files?folder=music/ROL
 * Devuelve todos los archivos de la carpeta y sus subcarpetas
 */
app.get('/api/files', (req, res) => {
    const folderPath = req.query.folder;
    
    if (!folderPath) {
        return res.status(400).json({ error: 'Parámetro "folder" requerido' });
    }
    
    let fullPath;
    let isAbsolute = false;
    let alias = null;
    
    // Verificar si es una ruta absoluta (Windows: C:\ o Linux/Mac: /)
    if (path.isAbsolute(folderPath)) {
        fullPath = path.normalize(folderPath);
        isAbsolute = true;
        
        // Crear alias para la ruta (hash o nombre de carpeta)
        alias = 'abs_' + path.basename(fullPath) + '_' + Math.abs(hashCode(fullPath));
        absoluteFoldersMap.set(alias, fullPath);
    } else {
        // Ruta relativa al proyecto
        const safePath = path.normalize(folderPath).replace(/^(\.\.[\/\\])+/, '');
        fullPath = path.join(__dirname, safePath);
    }
    
    // Verificar que la carpeta existe
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: `Carpeta no encontrada: ${folderPath}` });
    }
    
    if (!fs.statSync(fullPath).isDirectory()) {
        return res.status(400).json({ error: `No es una carpeta: ${folderPath}` });
    }
    
    try {
        // Escanear recursivamente la carpeta y subcarpetas
        // Usar solo el nombre de la carpeta base, no todo el path
        const baseFolderName = path.basename(fullPath);
        const files = scanFolderRecursive(fullPath, baseFolderName, isAbsolute, alias, fullPath);
        res.json({
            folder: folderPath,
            files: files,
            totalFiles: files.length,
            isAbsolute: isAbsolute
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * API: Obtener estructura completa de carpetas de música
 * GET /api/music-tree
 */
app.get('/api/music-tree', (req, res) => {
    const musicPath = path.join(__dirname, 'music');
    
    if (!fs.existsSync(musicPath)) {
        return res.json({ folders: [] });
    }
    
    try {
        const tree = scanMusicTree(musicPath, 'music');
        res.json(tree);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Escanea una carpeta y devuelve archivos de audio
 */
function scanFolder(fullPath, relativePath) {
    const items = fs.readdirSync(fullPath);
    const files = [];
    
    for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (SUPPORTED_FORMATS.includes(ext)) {
                files.push({
                    name: cleanFileName(item),
                    displayName: cleanFileName(item),
                    fileName: item,
                    folder: relativePath,
                    path: `${relativePath}/${item}`,
                    src: `${relativePath}/${item}`,
                    extension: ext
                });
            }
        }
    }
    
    // Ordenar alfabéticamente
    files.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
    
    return files;
}

/**
 * Escanea una carpeta RECURSIVAMENTE y devuelve todos los archivos de audio
 * incluyendo subcarpetas
 */
function scanFolderRecursive(fullPath, relativePath, isAbsolute = false, alias = null, basePath = null) {
    const items = fs.readdirSync(fullPath);
    let files = [];
    
    // Si no hay basePath, usar fullPath como base
    if (!basePath) basePath = fullPath;
    
    for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            // Construir path relativo desde la carpeta base
            const itemRelativePath = path.relative(basePath, itemPath).replace(/\\/g, '/');
            const displayPath = relativePath ? `${relativePath}/${item}` : item;
            
            // Recursivamente escanear subcarpetas
            const subFiles = scanFolderRecursive(itemPath, displayPath, isAbsolute, alias, basePath);
            files = files.concat(subFiles);
        } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (SUPPORTED_FORMATS.includes(ext)) {
                // Path relativo desde la carpeta base configurada
                const relativeFromBase = path.relative(basePath, itemPath).replace(/\\/g, '/');
                
                // Para rutas absolutas, usar el endpoint /absolute-music
                const src = isAbsolute 
                    ? `/absolute-music/${alias}/${relativeFromBase}`
                    : `${path.dirname(path.relative(basePath, fullPath)).replace(/\\/g, '/')}/${relativeFromBase}`.replace(/^\.\//, '').replace(/^\//, '');
                
                files.push({
                    name: cleanFileName(item),
                    displayName: cleanFileName(item),
                    fileName: item,
                    folder: relativePath || path.basename(basePath),
                    path: `${relativePath || path.basename(basePath)}/${item}`,
                    src: isAbsolute ? src : relativeFromBase,
                    extension: ext,
                    isFromServer: true,
                    isAbsolute: isAbsolute
                });
            }
        }
    }
    
    return files;
}

/**
 * Genera un hash simple para strings
 */
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

/**
 * Escanea recursivamente la carpeta de música
 */
function scanMusicTree(fullPath, relativePath) {
    const items = fs.readdirSync(fullPath);
    const result = {
        folders: [],
        totalFiles: 0
    };
    
    for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            const folderRelativePath = `${relativePath}/${item}`;
            const files = scanFolder(itemPath, folderRelativePath);
            
            if (files.length > 0) {
                result.folders.push({
                    name: item,
                    path: folderRelativePath,
                    fileCount: files.length,
                    files: files
                });
                result.totalFiles += files.length;
            }
            
            // Escanear subcarpetas
            const subTree = scanMusicTree(itemPath, folderRelativePath);
            result.folders.push(...subTree.folders);
            result.totalFiles += subTree.totalFiles;
        }
    }
    
    return result;
}

/**
 * Limpia el nombre del archivo para mostrar
 */
function cleanFileName(filename) {
    const idx = filename.lastIndexOf('.');
    let name = idx !== -1 ? filename.slice(0, idx) : filename;
    // Quitar números de track (01 -, 01., etc.)
    name = name.replace(/^\d{1,3}[\s._-]+/, '');
    return name.trim();
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log('');
    console.log('🎶 ═══════════════════════════════════════════');
    console.log('   BARDIC TUNES - Servidor de Música para Rol');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log(`   🌐 Abre en tu navegador: http://localhost:${PORT}`);
    console.log('');
    console.log('   📁 Coloca tu música en la carpeta "music/"');
    console.log('   📝 Configura las rutas en "config.js"');
    console.log('');
    console.log('   Presiona Ctrl+C para detener el servidor');
    console.log('═══════════════════════════════════════════════');
});
