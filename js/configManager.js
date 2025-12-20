/**
 * ConfigManager - Gestión de configuración y carpetas guardadas
 * Usa localStorage para persistencia (compatible con todos los navegadores)
 */
class ConfigManager {
    constructor() {
        this.savedFolders = [];
        this.config = {
            defaultVolume: 0.8,
            defaultMode: 'manual',
            autoPlay: false,
            lastFolder: null
        };
        
        // Callbacks
        this.onFoldersUpdate = null;
        
        this._loadFromStorage();
    }
    
    /**
     * Carga datos desde localStorage
     */
    _loadFromStorage() {
        try {
            // Cargar carpetas guardadas
            const savedFoldersData = localStorage.getItem('bardicTunes_savedFolders');
            if (savedFoldersData) {
                this.savedFolders = JSON.parse(savedFoldersData);
            }
            
            // Cargar configuración
            const configData = localStorage.getItem('bardicTunes_config');
            if (configData) {
                this.config = { ...this.config, ...JSON.parse(configData) };
            }
        } catch (error) {
            console.warn('Error cargando configuración:', error);
        }
    }
    
    /**
     * Guarda datos en localStorage
     */
    _saveToStorage() {
        try {
            localStorage.setItem('bardicTunes_savedFolders', JSON.stringify(this.savedFolders));
            localStorage.setItem('bardicTunes_config', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Error guardando configuración:', error);
        }
    }
    
    /**
     * Guarda una carpeta en favoritos
     * @param {string} name - Nombre a mostrar
     * @param {string} path - Ruta de la carpeta (para referencia)
     * @param {number} fileCount - Número de archivos
     */
    saveFolder(name, path, fileCount = 0) {
        // Verificar si ya existe
        const existingIndex = this.savedFolders.findIndex(f => f.path === path);
        
        const folderData = {
            id: existingIndex !== -1 ? this.savedFolders[existingIndex].id : Date.now(),
            name: name,
            path: path,
            fileCount: fileCount,
            savedAt: new Date().toISOString()
        };
        
        if (existingIndex !== -1) {
            this.savedFolders[existingIndex] = folderData;
        } else {
            this.savedFolders.push(folderData);
        }
        
        this._saveToStorage();
        
        if (this.onFoldersUpdate) {
            this.onFoldersUpdate(this.savedFolders);
        }
        
        return folderData;
    }
    
    /**
     * Elimina una carpeta de favoritos
     * @param {number} id - ID de la carpeta
     */
    removeFolder(id) {
        this.savedFolders = this.savedFolders.filter(f => f.id !== id);
        this._saveToStorage();
        
        if (this.onFoldersUpdate) {
            this.onFoldersUpdate(this.savedFolders);
        }
    }
    
    /**
     * Renombra una carpeta guardada
     * @param {number} id - ID de la carpeta
     * @param {string} newName - Nuevo nombre
     */
    renameFolder(id, newName) {
        const folder = this.savedFolders.find(f => f.id === id);
        if (folder) {
            folder.name = newName;
            this._saveToStorage();
            
            if (this.onFoldersUpdate) {
                this.onFoldersUpdate(this.savedFolders);
            }
        }
    }
    
    /**
     * Obtiene todas las carpetas guardadas
     */
    getSavedFolders() {
        return this.savedFolders;
    }
    
    /**
     * Obtiene una carpeta por ID
     * @param {number} id 
     */
    getFolderById(id) {
        return this.savedFolders.find(f => f.id === id);
    }
    
    /**
     * Guarda la última carpeta cargada
     * @param {string} path 
     */
    setLastFolder(path) {
        this.config.lastFolder = path;
        this._saveToStorage();
    }
    
    /**
     * Obtiene la última carpeta cargada
     */
    getLastFolder() {
        return this.config.lastFolder;
    }
    
    /**
     * Actualiza configuración
     * @param {Object} newConfig 
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this._saveToStorage();
    }
    
    /**
     * Obtiene la configuración actual
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * Limpia todas las carpetas guardadas
     */
    clearSavedFolders() {
        this.savedFolders = [];
        this._saveToStorage();
        
        if (this.onFoldersUpdate) {
            this.onFoldersUpdate(this.savedFolders);
        }
    }
    
    /**
     * Exporta configuración como JSON
     */
    exportConfig() {
        return JSON.stringify({
            savedFolders: this.savedFolders,
            config: this.config,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }
    
    /**
     * Importa configuración desde JSON
     * @param {string} jsonString 
     */
    importConfig(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.savedFolders) {
                this.savedFolders = data.savedFolders;
            }
            if (data.config) {
                this.config = { ...this.config, ...data.config };
            }
            
            this._saveToStorage();
            
            if (this.onFoldersUpdate) {
                this.onFoldersUpdate(this.savedFolders);
            }
            
            return true;
        } catch (error) {
            console.error('Error importando configuración:', error);
            return false;
        }
    }
}

// Exportar para uso en otros módulos
window.ConfigManager = ConfigManager;
