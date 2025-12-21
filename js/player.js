/**
 * AudioPlayer - Clase principal del reproductor de audio
 * Maneja la reproducción, controles y eventos del audio
 */
class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentTrack = null;
        this.volume = 0.8;
        this.isMuted = false;
        this.isLooping = false;
        this.isSeeking = false;
        
        // Callbacks para eventos externos
        this.onTrackEnd = null;
        this.onTimeUpdate = null;
        this.onTrackLoaded = null;
        this.onPlayStateChange = null;
        
        this._initAudio();
        this._loadSettings();
    }
    
    /**
     * Inicializa los eventos del elemento audio
     */
    _initAudio() {
        // Cuando se cargan los metadatos (duración disponible)
        this.audio.addEventListener('loadedmetadata', () => {
            if (this.onTrackLoaded) {
                this.onTrackLoaded({
                    duration: this.audio.duration,
                    title: this.currentTrack?.name || 'Desconocido',
                    folder: this.currentTrack?.folder || ''
                });
            }
        });
        
        // Actualización del tiempo durante reproducción
        this.audio.addEventListener('timeupdate', () => {
            if (!this.isSeeking && this.onTimeUpdate) {
                this.onTimeUpdate({
                    currentTime: this.audio.currentTime,
                    duration: this.audio.duration,
                    progress: (this.audio.currentTime / this.audio.duration) * 100 || 0
                });
            }
        });
        
        // Cuando termina la canción
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
            if (this.onTrackEnd) {
                this.onTrackEnd();
            }
        });
        
        // Cambios de estado de reproducción
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(true);
            }
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
        });
        
        // Errores
        this.audio.addEventListener('error', (e) => {
            console.error('Error de audio:', e);
            this.isPlaying = false;
        });
    }
    
    /**
     * Carga configuraciones desde localStorage
     */
    _loadSettings() {
        const savedVolume = localStorage.getItem('bardicTunes_volume');
        const savedMuted = localStorage.getItem('bardicTunes_muted');
        const savedLoop = localStorage.getItem('bardicTunes_loop');
        
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
        }
        if (savedMuted !== null) {
            this.isMuted = savedMuted === 'true';
        }
        if (savedLoop !== null) {
            this.isLooping = savedLoop === 'true';
        }
        
        this.audio.volume = this.isMuted ? 0 : this.volume;
        this.audio.loop = this.isLooping;
    }
    
    /**
     * Guarda configuraciones en localStorage
     */
    _saveSettings() {
        localStorage.setItem('bardicTunes_volume', this.volume.toString());
        localStorage.setItem('bardicTunes_muted', this.isMuted.toString());
        localStorage.setItem('bardicTunes_loop', this.isLooping.toString());
    }
    
    /**
     * Carga y prepara una pista para reproducir
     * @param {Object} track - Objeto con info de la pista {file, name, folder, src}
     */
    loadTrack(track) {
        // Limpiar objectUrl anterior si existe
        if (this.currentTrack?.objectUrl) {
            URL.revokeObjectURL(this.currentTrack.objectUrl);
        }
        
        this.currentTrack = track;
        
        // Archivos locales del navegador (tienen objeto File)
        if (track.file instanceof File) {
            console.log('🎵 Cargando archivo local:', track.name);
            track.objectUrl = URL.createObjectURL(track.file);
            this.audio.src = track.objectUrl;
        } 
        // Archivos del servidor (tienen src como URL)
        else if (track.src) {
            console.log('🎵 Cargando desde servidor:', track.name);
            this.audio.src = track.src;
        }
        // Fallback: intentar con path
        else if (track.path) {
            console.log('🎵 Cargando desde path:', track.name);
            this.audio.src = track.path;
        }
        else {
            console.error('❌ No se puede cargar el track:', track);
            return;
        }
        
        this.audio.load();
    }
    
    /**
     * Reproduce o reanuda la pista actual
     */
    async play() {
        if (!this.audio.src) return;
        
        try {
            await this.audio.play();
            this.isPlaying = true;
        } catch (error) {
            console.error('Error al reproducir:', error);
        }
    }
    
    /**
     * Pausa la reproducción
     */
    pause() {
        this.audio.pause();
        this.isPlaying = false;
    }
    
    /**
     * Alterna entre play y pause
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    /**
     * Detiene la reproducción y vuelve al inicio
     */
    stop() {
        this.pause();
        this.audio.currentTime = 0;
    }
    
    /**
     * Salta a una posición específica
     * @param {number} time - Tiempo en segundos
     */
    seek(time) {
        if (isNaN(this.audio.duration)) return;
        this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
    }
    
    /**
     * Salta a un porcentaje de la canción
     * @param {number} percent - Porcentaje (0-100)
     */
    seekToPercent(percent) {
        if (isNaN(this.audio.duration)) return;
        const time = (percent / 100) * this.audio.duration;
        this.seek(time);
    }
    
    /**
     * Avanza o retrocede un número de segundos
     * @param {number} seconds - Segundos (positivo avanza, negativo retrocede)
     */
    skip(seconds) {
        this.seek(this.audio.currentTime + seconds);
    }
    
    /**
     * Establece el volumen
     * @param {number} value - Volumen (0-1)
     */
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (!this.isMuted) {
            this.audio.volume = this.volume;
        }
        this._saveSettings();
    }
    
    /**
     * Obtiene el volumen actual
     */
    getVolume() {
        return this.volume;
    }
    
    /**
     * Silencia o restaura el audio
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audio.volume = this.isMuted ? 0 : this.volume;
        this._saveSettings();
        return this.isMuted;
    }
    
    /**
     * Establece el estado de mute
     * @param {boolean} muted 
     */
    setMuted(muted) {
        this.isMuted = muted;
        this.audio.volume = this.isMuted ? 0 : this.volume;
        this._saveSettings();
    }
    
    /**
     * Activa/desactiva el bucle
     */
    toggleLoop() {
        this.isLooping = !this.isLooping;
        this.audio.loop = this.isLooping;
        this._saveSettings();
        return this.isLooping;
    }
    
    /**
     * Establece el estado de loop
     * @param {boolean} loop 
     */
    setLoop(loop) {
        this.isLooping = loop;
        this.audio.loop = this.isLooping;
        this._saveSettings();
    }
    
    /**
     * Obtiene la duración formateada de la pista actual
     */
    getDuration() {
        return this.audio.duration || 0;
    }
    
    /**
     * Obtiene el tiempo actual de reproducción
     */
    getCurrentTime() {
        return this.audio.currentTime || 0;
    }
    
    /**
     * Formatea segundos a formato mm:ss
     * @param {number} seconds 
     */
    static formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Limpieza al destruir el reproductor
     */
    destroy() {
        this.stop();
        if (this.currentTrack?.objectUrl) {
            URL.revokeObjectURL(this.currentTrack.objectUrl);
        }
        this.audio = null;
    }
}

// Exportar para uso en otros módulos
window.AudioPlayer = AudioPlayer;
