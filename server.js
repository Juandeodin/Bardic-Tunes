/**
 * Servidor Express para Bardic Tunes
 * Permite escanear carpetas de música y servir archivos estáticos
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');

const app  = express();
const PORT = 3000;

// JWT secret — configura JWT_SECRET en variables de entorno en producción
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    const s = crypto.randomBytes(32).toString('hex');
    console.warn('\n⚠️  JWT_SECRET no configurado. Generando secreto temporal.');
    console.warn('   Los tokens expirarán al reiniciar el servidor.');
    console.warn('   Configura la variable de entorno JWT_SECRET para persistencia.\n');
    return s;
})();

// Directorios de datos de usuario (persistidos con volumen Docker)
const DATA_DIR      = path.join(__dirname, 'data');
const CAMPAIGNS_DIR = path.join(DATA_DIR, 'campaigns');
const USERS_FILE    = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR))      fs.mkdirSync(DATA_DIR,      { recursive: true });
if (!fs.existsSync(CAMPAIGNS_DIR)) fs.mkdirSync(CAMPAIGNS_DIR, { recursive: true });

// ============================================
// HELPERS: DATOS DE USUARIO
// ============================================

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
    catch { return []; }
}

function writeUsers(users) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readCampaigns(userId) {
    const file = path.join(CAMPAIGNS_DIR, userId + '.json');
    if (!fs.existsSync(file)) return { campaigns: [], activeCampaignId: null };
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return { campaigns: [], activeCampaignId: null }; }
}

function writeCampaigns(userId, data) {
    const file = path.join(CAMPAIGNS_DIR, userId + '.json');
    fs.mkdirSync(CAMPAIGNS_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
}

function verifyToken(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    try { return jwt.verify(token, JWT_SECRET); }
    catch { return null; }
}

// Formatos de audio soportados
const SUPPORTED_FORMATS = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac', '.webm'];

// Mapa de carpetas absolutas configuradas (se cargan desde config.js)
const absoluteFoldersMap = new Map();

// Bloquear acceso directo a datos de usuario (ANTES que express.static)
app.use('/data', (_req, res) => res.status(403).json({ error: 'Forbidden' }));

// Body parser para rutas API
app.use(express.json({ limit: '10mb' }));

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
 * AUTH: Registro de nuevo usuario
 * POST /api/auth/register
 */
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password)
        return res.status(400).json({ error: 'Nombre de usuario y contraseña requeridos' });

    const trimName = username.trim();
    if (trimName.length < 3 || trimName.length > 30)
        return res.status(400).json({ error: 'El nombre debe tener entre 3 y 30 caracteres' });
    if (!/^[\w\s\-áéíóúàèìòùñüÁÉÍÓÚÀÈÌÒÙÑÜ]+$/u.test(trimName))
        return res.status(400).json({ error: 'El nombre contiene caracteres no permitidos' });
    if (password.length < 6)
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const users = readUsers();
    if (users.find(u => u.username.toLowerCase() === trimName.toLowerCase()))
        return res.status(409).json({ error: 'Ese nombre de aventurero ya existe' });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
        id:           Date.now().toString(36) + Math.random().toString(36).slice(2),
        username:     trimName,
        passwordHash,
        createdAt:    Date.now()
    };
    users.push(newUser);
    writeUsers(users);

    const token = jwt.sign(
        { userId: newUser.id, username: newUser.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.json({ token, username: newUser.username });
});

/**
 * AUTH: Inicio de sesión
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password)
        return res.status(400).json({ error: 'Faltan credenciales' });

    const users = readUsers();
    const user  = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user)
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.json({ token, username: user.username });
});

/**
 * DATOS: Obtener partidas del usuario autenticado
 * GET /api/campaigns
 */
app.get('/api/campaigns', (req, res) => {
    const payload = verifyToken(req);
    if (!payload) return res.status(401).json({ error: 'No autenticado' });
    const safeId = payload.userId.replace(/[^a-z0-9_\-]/gi, '');
    res.json(readCampaigns(safeId));
});

/**
 * DATOS: Guardar partidas del usuario autenticado
 * PUT /api/campaigns
 */
app.put('/api/campaigns', (req, res) => {
    const payload = verifyToken(req);
    if (!payload) return res.status(401).json({ error: 'No autenticado' });
    const { campaigns, activeCampaignId } = req.body || {};
    if (!Array.isArray(campaigns))
        return res.status(400).json({ error: 'Datos inválidos' });
    const safeId = payload.userId.replace(/[^a-z0-9_\-]/gi, '');
    writeCampaigns(safeId, { campaigns, activeCampaignId: activeCampaignId || null });
    res.json({ ok: true });
});

/**
 * API: Obtener configuración del servidor (carpetas desde variables de entorno)
 * GET /api/server-config
 * Lee MUSIC_FOLDERS (separadas por coma) y las devuelve al cliente
 */
app.get('/api/server-config', (req, res) => {
    const musicFoldersEnv = process.env.MUSIC_FOLDERS;
    
    if (!musicFoldersEnv) {
        return res.json({ folders: [] });
    }
    
    const folders = musicFoldersEnv
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);
    
    res.json({ folders });
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
