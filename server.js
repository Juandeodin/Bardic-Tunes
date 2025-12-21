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

// Servir archivos estáticos (HTML, CSS, JS, música)
app.use(express.static('.'));

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
    
    // Seguridad: evitar acceso a carpetas fuera del proyecto
    const safePath = path.normalize(folderPath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(__dirname, safePath);
    
    // Verificar que la carpeta existe
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: `Carpeta no encontrada: ${folderPath}` });
    }
    
    if (!fs.statSync(fullPath).isDirectory()) {
        return res.status(400).json({ error: `No es una carpeta: ${folderPath}` });
    }
    
    try {
        // Escanear recursivamente la carpeta y subcarpetas
        const files = scanFolderRecursive(fullPath, safePath);
        res.json({
            folder: safePath,
            files: files,
            totalFiles: files.length
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
function scanFolderRecursive(fullPath, relativePath) {
    const items = fs.readdirSync(fullPath);
    let files = [];
    
    for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const itemRelativePath = `${relativePath}/${item}`;
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            // Recursivamente escanear subcarpetas
            const subFiles = scanFolderRecursive(itemPath, itemRelativePath);
            files = files.concat(subFiles);
        } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (SUPPORTED_FORMATS.includes(ext)) {
                files.push({
                    name: cleanFileName(item),
                    displayName: cleanFileName(item),
                    fileName: item,
                    folder: relativePath,
                    path: itemRelativePath,
                    src: itemRelativePath,
                    extension: ext,
                    isFromServer: true
                });
            }
        }
    }
    
    return files;
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
