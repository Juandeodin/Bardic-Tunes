/**
 * Playlist - Gestión de la lista de reproducción
 * Maneja la cola de canciones, modos de reproducción y navegación
 */
class Playlist {
    constructor() {
        this.tracks = [];
        this.currentIndex = -1;
        this.mode = 'manual'; // 'manual', 'sequential', 'shuffle'
        this.shuffleOrder = [];
        this.shuffleIndex = -1;
        
        // Callbacks
        this.onTrackChange = null;
        this.onPlaylistUpdate = null;
        this.onModeChange = null;
        
        this._loadSettings();
    }
    
    /**
     * Carga configuraciones desde localStorage
     */
    _loadSettings() {
        const savedMode = localStorage.getItem('bardicTunes_playbackMode');
        if (savedMode) {
            this.mode = savedMode;
        }
    }
    
    /**
     * Guarda configuraciones en localStorage
     */
    _saveSettings() {
        localStorage.setItem('bardicTunes_playbackMode', this.mode);
    }
    
    /**
     * Añade pistas a la playlist
     * @param {Array} tracks - Array de objetos track
     * @param {boolean} replace - Si true, reemplaza la playlist; si false, añade
     */
    addTracks(tracks, replace = true) {
        if (replace) {
            this.tracks = [...tracks];
            this.currentIndex = -1;
        } else {
            // Filtrar duplicados al añadir
            const newTracks = tracks.filter(t => !this.hasTrack(t.path));
            this.tracks = [...this.tracks, ...newTracks];
        }
        
        // Regenerar orden aleatorio si está en modo shuffle
        if (this.mode === 'shuffle') {
            this._generateShuffleOrder();
        }
        
        if (this.onPlaylistUpdate) {
            this.onPlaylistUpdate(this.tracks, this.currentIndex);
        }
    }
    
    /**
     * Añade una única pista a la playlist
     * @param {Object} track - Objeto track
     * @returns {boolean} true si se añadió, false si ya existía
     */
    addTrack(track) {
        if (this.hasTrack(track.path)) {
            return false;
        }
        
        this.tracks.push(track);
        
        if (this.mode === 'shuffle') {
            this._generateShuffleOrder();
        }
        
        if (this.onPlaylistUpdate) {
            this.onPlaylistUpdate(this.tracks, this.currentIndex);
        }
        
        return true;
    }
    
    /**
     * Comprueba si una pista está en la playlist
     * @param {string} path - Ruta del archivo
     * @returns {boolean}
     */
    hasTrack(path) {
        return this.tracks.some(t => t.path === path);
    }
    
    /**
     * Elimina una pista por su ruta
     * @param {string} path - Ruta del archivo
     */
    removeTrackByPath(path) {
        const index = this.tracks.findIndex(t => t.path === path);
        if (index !== -1) {
            this.removeTrack(index);
        }
    }
    
    /**
     * Elimina múltiples pistas por sus rutas
     * @param {Array} paths - Array de rutas
     */
    removeTracksByPaths(paths) {
        paths.forEach(path => this.removeTrackByPath(path));
    }
    
    /**
     * Limpia la playlist
     */
    clear() {
        this.tracks = [];
        this.currentIndex = -1;
        this.shuffleOrder = [];
        this.shuffleIndex = -1;
        
        if (this.onPlaylistUpdate) {
            this.onPlaylistUpdate(this.tracks, this.currentIndex);
        }
    }
    
    /**
     * Establece el modo de reproducción
     * @param {string} mode - 'manual', 'sequential', 'shuffle'
     */
    setMode(mode) {
        this.mode = mode;
        
        if (mode === 'shuffle') {
            this._generateShuffleOrder();
            // Encontrar posición actual en el orden aleatorio
            if (this.currentIndex >= 0) {
                this.shuffleIndex = this.shuffleOrder.indexOf(this.currentIndex);
            }
        }
        
        this._saveSettings();
        
        if (this.onModeChange) {
            this.onModeChange(mode);
        }
    }
    
    /**
     * Obtiene el modo actual
     */
    getMode() {
        return this.mode;
    }
    
    /**
     * Genera un orden aleatorio para shuffle
     */
    _generateShuffleOrder() {
        this.shuffleOrder = [...Array(this.tracks.length).keys()];
        
        // Fisher-Yates shuffle
        for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffleOrder[i], this.shuffleOrder[j]] = 
            [this.shuffleOrder[j], this.shuffleOrder[i]];
        }
        
        this.shuffleIndex = -1;
    }
    
    /**
     * Reproduce una pista por índice
     * @param {number} index 
     */
    playTrack(index) {
        if (index < 0 || index >= this.tracks.length) return null;
        
        this.currentIndex = index;
        
        // Actualizar posición en shuffle si aplica
        if (this.mode === 'shuffle') {
            this.shuffleIndex = this.shuffleOrder.indexOf(index);
        }
        
        if (this.onPlaylistUpdate) {
            this.onPlaylistUpdate(this.tracks, this.currentIndex);
        }
        
        if (this.onTrackChange) {
            this.onTrackChange(this.tracks[index], index);
        }
        
        return this.tracks[index];
    }
    
    /**
     * Obtiene la pista actual
     */
    getCurrentTrack() {
        if (this.currentIndex < 0 || this.currentIndex >= this.tracks.length) {
            return null;
        }
        return this.tracks[this.currentIndex];
    }
    
    /**
     * Obtiene el índice actual
     */
    getCurrentIndex() {
        return this.currentIndex;
    }
    
    /**
     * Avanza a la siguiente pista según el modo
     * @returns {Object|null} La siguiente pista o null si no hay más
     */
    next() {
        if (this.tracks.length === 0) return null;
        
        let nextIndex;
        
        switch (this.mode) {
            case 'shuffle':
                this.shuffleIndex++;
                if (this.shuffleIndex >= this.shuffleOrder.length) {
                    // Fin de la lista aleatoria, regenerar
                    this._generateShuffleOrder();
                    this.shuffleIndex = 0;
                }
                nextIndex = this.shuffleOrder[this.shuffleIndex];
                break;
                
            case 'sequential':
                nextIndex = this.currentIndex + 1;
                if (nextIndex >= this.tracks.length) {
                    nextIndex = 0; // Volver al inicio
                }
                break;
                
            case 'manual':
            default:
                // En modo manual, next solo avanza si el usuario lo pide explícitamente
                nextIndex = this.currentIndex + 1;
                if (nextIndex >= this.tracks.length) {
                    return null; // No hay más canciones
                }
                break;
        }
        
        return this.playTrack(nextIndex);
    }
    
    /**
     * Retrocede a la pista anterior
     */
    previous() {
        if (this.tracks.length === 0) return null;
        
        let prevIndex;
        
        switch (this.mode) {
            case 'shuffle':
                this.shuffleIndex--;
                if (this.shuffleIndex < 0) {
                    this.shuffleIndex = this.shuffleOrder.length - 1;
                }
                prevIndex = this.shuffleOrder[this.shuffleIndex];
                break;
                
            default:
                prevIndex = this.currentIndex - 1;
                if (prevIndex < 0) {
                    prevIndex = this.tracks.length - 1; // Ir al final
                }
                break;
        }
        
        return this.playTrack(prevIndex);
    }
    
    /**
     * Llamado cuando una pista termina
     * Decide qué hacer según el modo
     */
    onTrackEnded() {
        switch (this.mode) {
            case 'sequential':
            case 'shuffle':
                return this.next();
            case 'manual':
            default:
                // En manual no hacemos nada automático
                return null;
        }
    }
    
    /**
     * Obtiene todas las pistas
     */
    getTracks() {
        return this.tracks;
    }
    
    /**
     * Obtiene el número total de pistas
     */
    getCount() {
        return this.tracks.length;
    }
    
    /**
     * Busca pistas por nombre
     * @param {string} query 
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.tracks.filter(track => 
            track.name.toLowerCase().includes(lowerQuery) ||
            track.folder?.toLowerCase().includes(lowerQuery)
        );
    }
    
    /**
     * Elimina una pista por índice
     * @param {number} index 
     */
    removeTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        
        this.tracks.splice(index, 1);
        
        // Ajustar índice actual si es necesario
        if (index < this.currentIndex) {
            this.currentIndex--;
        } else if (index === this.currentIndex) {
            this.currentIndex = -1;
        }
        
        // Regenerar shuffle
        if (this.mode === 'shuffle') {
            this._generateShuffleOrder();
        }
        
        if (this.onPlaylistUpdate) {
            this.onPlaylistUpdate(this.tracks, this.currentIndex);
        }
    }
    
    /**
     * Mueve una pista de una posición a otra
     * @param {number} fromIndex 
     * @param {number} toIndex 
     */
    moveTrack(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.tracks.length) return;
        if (toIndex < 0 || toIndex >= this.tracks.length) return;
        
        const [track] = this.tracks.splice(fromIndex, 1);
        this.tracks.splice(toIndex, 0, track);
        
        // Ajustar índice actual
        if (this.currentIndex === fromIndex) {
            this.currentIndex = toIndex;
        } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
            this.currentIndex--;
        } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
            this.currentIndex++;
        }
        
        if (this.onPlaylistUpdate) {
            this.onPlaylistUpdate(this.tracks, this.currentIndex);
        }
    }
}

// Exportar para uso en otros módulos
window.Playlist = Playlist;
