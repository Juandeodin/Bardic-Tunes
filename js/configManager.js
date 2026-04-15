/**
 * ConfigManager - Gestión de configuración y precarga de carpetas
 * Usa la API del servidor para escanear carpetas de música
 */
class ConfigManager {
    constructor() {
        this.config = window.MUSIC_CONFIG || {
            folders: [],
            settings: {
                defaultVolume: 0.8,
                defaultMode: 'manual',
                supportedFormats: ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac', '.webm']
            }
        };
        
        this.loadedFolders = [];
        this.isLoading = false;
        this.useServer = true; // Usar API del servidor
        
        // Callbacks
        this.onFolderLoaded = null;  // callback(folderName, files[])
        this.onAllFoldersLoaded = null;  // callback(allFiles[])
        this.onLoadError = null;  // callback(folderPath, error)
    }
    
    /**
     * Obtiene la configuración de settings
     */
    getSettings() {
        return this.config.settings;
    }
    
    /**
     * Obtiene las carpetas configuradas
     */
    getConfiguredFolders() {
        return this.config.folders || [];
    }
    
    /**
     * Obtiene las carpetas del servidor (variable de entorno MUSIC_FOLDERS).
     * Si no hay ninguna, devuelve array vacío.
     * @returns {Promise<string[]>}
     */
    async getServerFolders() {
        try {
            const res = await fetch('/api/server-config');
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data.folders) ? data.folders : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Carga todas las carpetas configuradas.
     * Prioridad: variable de entorno MUSIC_FOLDERS (Docker) > config.js
     * @returns {Promise<Array>} Array con todos los archivos cargados
     */
    async loadAllFolders() {
        // Intentar obtener carpetas desde la variable de entorno del servidor
        const serverFolders = await this.getServerFolders();
        const folders = serverFolders.length > 0
            ? serverFolders
            : this.getConfiguredFolders();
        
        if (folders.length === 0) {
            console.log('📁 No hay carpetas configuradas (ni en MUSIC_FOLDERS ni en config.js)');
            return [];
        }
        
        if (serverFolders.length > 0) {
            console.log(`🐳 Usando carpetas de variable de entorno MUSIC_FOLDERS`);
        }
        
        this.isLoading = true;
        const allFiles = [];
        
        console.log(`📁 Cargando ${folders.length} carpetas...`);
        
        for (const folderPath of folders) {
            try {
                const files = await this.loadFolder(folderPath);
                allFiles.push(...files);
                
                if (this.onFolderLoaded) {
                    const folderName = folderPath.split('/').pop();
                    this.onFolderLoaded(folderName, files);
                }
            } catch (error) {
                console.warn(`⚠️ Error cargando carpeta "${folderPath}":`, error.message);
                if (this.onLoadError) {
                    this.onLoadError(folderPath, error);
                }
            }
        }
        
        this.isLoading = false;
        
        if (this.onAllFoldersLoaded) {
            this.onAllFoldersLoaded(allFiles);
        }
        
        console.log(`✅ Carga completa: ${allFiles.length} archivos de ${folders.length} carpetas`);
        return allFiles;
    }
    
    /**
     * Carga una carpeta usando la API del servidor
     * @param {string} folderPath - Ruta relativa de la carpeta
     * @returns {Promise<Array>} Array de objetos de archivo
     */
    async loadFolder(folderPath) {
        try {
            // Usar API del servidor para escanear la carpeta (recursivo)
            const response = await fetch(`/api/files?folder=${encodeURIComponent(folderPath)}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status} al cargar ${folderPath}`);
            }
            
            const data = await response.json();
            const files = data.files || [];
            
            console.log(`📁 Carpeta "${folderPath}" cargada: ${files.length} archivos`);
            
            // Marcar archivos como provenientes del servidor
            files.forEach(f => {
                f.isFromConfig = true;
                f.isFromServer = true;
            });
            
            this.loadedFolders.push({
                path: folderPath,
                name: folderPath.split('/').pop(),
                files: files
            });
            
            return files;
            
        } catch (error) {
            // Si falla la API, puede que no esté corriendo el servidor
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Servidor no disponible. Ejecuta: npm start');
            }
            throw error;
        }
    }
    
    /**
     * Carga todo el árbol de música automáticamente (sin config.js)
     * @returns {Promise<Object>} Árbol completo de música
     */
    async loadMusicTree() {
        try {
            const response = await fetch('/api/music-tree');
            
            if (!response.ok) {
                throw new Error('No se pudo cargar el árbol de música');
            }
            
            const tree = await response.json();
            return tree;
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Servidor no disponible. Ejecuta: npm start');
            }
            throw error;
        }
    }
    
    /**
     * Verifica si hay carpetas configuradas
     */
    hasFoldersConfigured() {
        return this.config.folders && this.config.folders.length > 0;
    }
    
    /**
     * Obtiene las carpetas ya cargadas
     */
    getLoadedFolders() {
        return this.loadedFolders;
    }
}

// Exportar para uso en otros módulos
window.ConfigManager = ConfigManager;

