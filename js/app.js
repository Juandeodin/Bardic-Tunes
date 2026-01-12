/**
 * App.js - Controlador principal de Bardic Tunes
 * Conecta todos los módulos y maneja la UI
 */
document.addEventListener('DOMContentLoaded', () => {
    // ============================================
    // INICIALIZACIÓN DE MÓDULOS
    // ============================================
    
    const player = new AudioPlayer();
    const playlist = new Playlist();
    const fileExplorer = new FileExplorer(document.getElementById('file-tree'));
    const configManager = new ConfigManager();
    
    // ============================================
    // ELEMENTOS DEL DOM
    // ============================================
    
    const elements = {
        // Botones de carga
        btnLoadFolder: document.getElementById('btn-load-folder'),
        folderInput: document.getElementById('folder-input'),
        
        // Info de pista
        trackTitle: document.getElementById('track-title'),
        trackFolder: document.getElementById('track-folder'),
        
        // Progreso
        timeCurrent: document.getElementById('time-current'),
        timeDuration: document.getElementById('time-duration'),
        progressBar: document.getElementById('progress-bar'),
        progressFill: document.getElementById('progress-fill'),
        progressHandle: document.getElementById('progress-handle'),
        
        // Controles principales
        btnPlay: document.getElementById('btn-play'),
        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        btnShuffle: document.getElementById('btn-shuffle'),
        btnLoop: document.getElementById('btn-loop'),
        
        // Controles secundarios
        btnMute: document.getElementById('btn-mute'),
        volumeSlider: document.getElementById('volume-slider'),
        playbackMode: document.getElementById('playback-mode'),
        
        // Playlist
        playlistElement: document.getElementById('playlist'),
        playlistCount: document.getElementById('playlist-count'),
        btnClearPlaylist: document.getElementById('btn-clear-playlist')
    };
    
    // ============================================
    // CONFIGURACIÓN DE CALLBACKS
    // ============================================
    
    // Player callbacks
    player.onTrackLoaded = (info) => {
        elements.trackTitle.textContent = info.title;
        elements.trackFolder.textContent = info.folder || 'Carpeta raíz';
        elements.timeDuration.textContent = AudioPlayer.formatTime(info.duration);
    };
    
    player.onTimeUpdate = (info) => {
        elements.timeCurrent.textContent = AudioPlayer.formatTime(info.currentTime);
        elements.progressFill.style.width = `${info.progress}%`;
        elements.progressHandle.style.left = `${info.progress}%`;
    };
    
    player.onPlayStateChange = (isPlaying) => {
        elements.btnPlay.textContent = isPlaying ? '⏸️' : '▶️';
        elements.btnPlay.title = isPlaying ? 'Pausar' : 'Reproducir';
        
        // Actualizar indicador visual en playlist
        updatePlaylistUI();
    };
    
    player.onTrackEnd = () => {
        const nextTrack = playlist.onTrackEnded();
        if (nextTrack) {
            player.loadTrack(nextTrack);
            player.play();
        }
    };
    
    // Playlist callbacks
    playlist.onTrackChange = (track, index) => {
        player.loadTrack(track);
        player.play();
        fileExplorer.setPlayingFile(track.path);
        updatePlaylistUI();
    };
    
    playlist.onPlaylistUpdate = (tracks, currentIndex) => {
        updatePlaylistUI();
        elements.playlistCount.textContent = `${tracks.length} canciones`;
    };
    
    playlist.onModeChange = (mode) => {
        elements.playbackMode.value = mode;
        elements.btnShuffle.classList.toggle('active', mode === 'shuffle');
    };
    
    // FileExplorer callbacks
    fileExplorer.onFileSelect = (file, playNow) => {
        if (playNow) {
            // Doble click: añadir si no está y reproducir
            if (!playlist.hasTrack(file.path)) {
                playlist.addTrack(file);
            }
            const index = playlist.getTracks().findIndex(t => t.path === file.path);
            if (index !== -1) {
                playlist.playTrack(index);
            }
        }
    };
    
    fileExplorer.onFilesLoaded = (files) => {
        // Ya NO añade automáticamente a la playlist
        // Solo muestra los archivos en el explorador
        console.log(`🎵 ${files.length} archivos de audio cargados en el explorador`);
    };
    
    // Función para verificar si un track está en la playlist
    fileExplorer.checkInPlaylist = (path) => {
        return playlist.hasTrack(path);
    };
    
    // Callback para añadir track individual
    fileExplorer.onAddTrack = (track) => {
        playlist.addTrack(track);
        fileExplorer.render(); // Re-renderizar para actualizar iconos
    };
    
    // Callback para quitar track individual
    fileExplorer.onRemoveTrack = (track) => {
        playlist.removeTrackByPath(track.path);
        fileExplorer.render();
    };
    
    // Callback para añadir carpeta completa
    fileExplorer.onAddFolder = (folderPath, files) => {
        playlist.addTracks(files, false); // false = no reemplazar
        fileExplorer.render();
    };
    
    // Callback para quitar carpeta completa
    fileExplorer.onRemoveFolder = (folderPath, files) => {
        const paths = files.map(f => f.path);
        playlist.removeTracksByPaths(paths);
        fileExplorer.render();
    };
    
    // ============================================
    // EVENT LISTENERS - CARGA DE ARCHIVOS
    // ============================================
    
    elements.btnLoadFolder.addEventListener('click', () => {
        elements.folderInput.click();
    });
    
    elements.folderInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            // append = true para NO limpiar las carpetas existentes
            fileExplorer.processFiles(e.target.files, true);
        }
    });
    
    // Drag and drop
    const dropZone = document.querySelector('.file-explorer-panel');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length > 0) {
            // append = true para NO limpiar las carpetas existentes
            fileExplorer.processFiles(e.dataTransfer.files, true);
        }
    });
    
    // ============================================
    // EVENT LISTENERS - CONTROLES DE REPRODUCCIÓN
    // ============================================
    
    elements.btnPlay.addEventListener('click', () => {
        if (!player.audio.src && playlist.getCount() > 0) {
            // Si no hay nada cargado, empezar con la primera
            playlist.playTrack(0);
        } else {
            player.togglePlay();
        }
    });
    
    elements.btnPrev.addEventListener('click', () => {
        // Si llevamos más de 3 segundos, volver al inicio de la canción
        if (player.getCurrentTime() > 3) {
            player.seek(0);
        } else {
            playlist.previous();
        }
    });
    
    elements.btnNext.addEventListener('click', () => {
        playlist.next();
    });
    
    elements.btnShuffle.addEventListener('click', () => {
        const currentMode = playlist.getMode();
        const newMode = currentMode === 'shuffle' ? 'sequential' : 'shuffle';
        playlist.setMode(newMode);
    });
    
    elements.btnLoop.addEventListener('click', () => {
        const isLooping = player.toggleLoop();
        elements.btnLoop.classList.toggle('active', isLooping);
    });
    
    // ============================================
    // EVENT LISTENERS - BARRA DE PROGRESO
    // ============================================
    
    let isDragging = false;
    
    const updateProgressFromEvent = (e) => {
        const rect = elements.progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        player.seekToPercent(percent);
    };
    
    elements.progressBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        player.isSeeking = true;
        elements.progressBar.classList.add('dragging');
        updateProgressFromEvent(e);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateProgressFromEvent(e);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            player.isSeeking = false;
            elements.progressBar.classList.remove('dragging');
        }
    });
    
    // ============================================
    // EVENT LISTENERS - VOLUMEN
    // ============================================
    
    elements.volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        player.setVolume(volume);
        updateVolumeIcon(volume);
    });
    
    elements.btnMute.addEventListener('click', () => {
        const isMuted = player.toggleMute();
        updateVolumeIcon(isMuted ? 0 : player.getVolume());
    });
    
    // ============================================
    // EVENT LISTENERS - MODO DE REPRODUCCIÓN
    // ============================================
    
    elements.playbackMode.addEventListener('change', (e) => {
        playlist.setMode(e.target.value);
    });
    
    // ============================================
    // EVENT LISTENERS - ATAJOS DE TECLADO
    // ============================================
    
    document.addEventListener('keydown', (e) => {
        // Ignorar si estamos escribiendo en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (!player.audio.src && playlist.getCount() > 0) {
                    playlist.playTrack(0);
                } else {
                    player.togglePlay();
                }
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                player.skip(-5);
                break;
                
            case 'ArrowRight':
                e.preventDefault();
                player.skip(5);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                const newVolUp = Math.min(1, player.getVolume() + 0.1);
                player.setVolume(newVolUp);
                elements.volumeSlider.value = newVolUp * 100;
                updateVolumeIcon(newVolUp);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                const newVolDown = Math.max(0, player.getVolume() - 0.1);
                player.setVolume(newVolDown);
                elements.volumeSlider.value = newVolDown * 100;
                updateVolumeIcon(newVolDown);
                break;
                
            case 'KeyM':
                e.preventDefault();
                const isMuted = player.toggleMute();
                updateVolumeIcon(isMuted ? 0 : player.getVolume());
                break;
                
            case 'KeyN':
                e.preventDefault();
                playlist.next();
                break;
                
            case 'KeyP':
                e.preventDefault();
                if (player.getCurrentTime() > 3) {
                    player.seek(0);
                } else {
                    playlist.previous();
                }
                break;
        }
    });
    
    // ============================================
    // FUNCIONES DE UI
    // ============================================
    
    function updateVolumeIcon(volume) {
        let icon = '🔊';
        if (volume === 0 || player.isMuted) {
            icon = '🔇';
        } else if (volume < 0.3) {
            icon = '🔈';
        } else if (volume < 0.7) {
            icon = '🔉';
        }
        elements.btnMute.textContent = icon;
    }
    
    function updatePlaylistUI() {
        const tracks = playlist.getTracks();
        const currentIndex = playlist.getCurrentIndex();
        
        if (tracks.length === 0) {
            elements.playlistElement.innerHTML = `
                <li class="empty-state">
                    <span>La cola está vacía</span>
                    <p class="hint">Usa los botones ➕ del explorador para añadir canciones</p>
                </li>
            `;
            return;
        }
        
        elements.playlistElement.innerHTML = tracks.map((track, index) => {
            const isPlaying = index === currentIndex;
            const playingClass = isPlaying ? 'playing' : '';
            const playingIcon = isPlaying ? `
                <div class="playing-indicator">
                    <span></span><span></span><span></span><span></span>
                </div>
            ` : '';
            
            return `
                <li class="playlist-item ${playingClass}" data-index="${index}" data-path="${track.path}" draggable="true">
                    <span class="playlist-item-drag-handle" title="Arrastra para reordenar">⠿</span>
                    <span class="playlist-item-index">
                        ${isPlaying && player.isPlaying ? playingIcon : (index + 1)}
                    </span>
                    <span class="playlist-item-name" title="${track.name}">${track.displayName}</span>
                    <button class="btn-playlist-remove" data-path="${track.path}" title="Quitar de la cola">✖</button>
                </li>
            `;
        }).join('');
        
        // Añadir event listeners a los items de playlist
        elements.playlistElement.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Ignorar si se hizo click en el botón de quitar o en el handle de arrastre
                if (e.target.classList.contains('btn-playlist-remove') || 
                    e.target.classList.contains('playlist-item-drag-handle')) return;
                
                const index = parseInt(item.dataset.index);
                playlist.playTrack(index);
            });
            
            // Event listeners para drag & drop
            setupDragAndDrop(item);
        });
        
        // Botones de quitar de playlist
        elements.playlistElement.querySelectorAll('.btn-playlist-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const path = btn.dataset.path;
                playlist.removeTrackByPath(path);
                fileExplorer.render(); // Actualizar iconos en explorador
            });
        });
    }
    
    // ============================================
    // DRAG & DROP PARA REORDENAR PLAYLIST
    // ============================================
    
    let draggedItem = null;
    let draggedIndex = null;
    
    function setupDragAndDrop(item) {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            draggedIndex = parseInt(item.dataset.index);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedIndex);
        });
        
        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            // Limpiar todos los indicadores
            elements.playlistElement.querySelectorAll('.playlist-item').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            draggedItem = null;
            draggedIndex = null;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedItem || draggedItem === item) return;
            
            e.dataTransfer.dropEffect = 'move';
            
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            // Limpiar clases anteriores
            elements.playlistElement.querySelectorAll('.playlist-item').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            
            // Añadir indicador visual
            if (e.clientY < midpoint) {
                item.classList.add('drag-over-top');
            } else {
                item.classList.add('drag-over-bottom');
            }
        });
        
        item.addEventListener('dragleave', (e) => {
            // Verificar que realmente salimos del elemento
            if (!item.contains(e.relatedTarget)) {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedItem || draggedItem === item) return;
            
            const dropIndex = parseInt(item.dataset.index);
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            let targetIndex;
            if (e.clientY < midpoint) {
                // Soltar antes del item
                targetIndex = dropIndex;
            } else {
                // Soltar después del item
                targetIndex = dropIndex + 1;
            }
            
            // Ajustar índice si estamos moviendo hacia abajo
            if (draggedIndex < targetIndex) {
                targetIndex--;
            }
            
            // Mover la pista
            if (draggedIndex !== targetIndex) {
                playlist.moveTrack(draggedIndex, targetIndex);
            }
            
            // Limpiar indicadores
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
    }
    
    // ============================================
    // INICIALIZACIÓN
    // ============================================
    
    // Cargar configuraciones guardadas
    const savedVolume = localStorage.getItem('bardicTunes_volume');
    if (savedVolume) {
        elements.volumeSlider.value = parseFloat(savedVolume) * 100;
        updateVolumeIcon(parseFloat(savedVolume));
    }
    
    const savedMode = localStorage.getItem('bardicTunes_playbackMode');
    if (savedMode) {
        elements.playbackMode.value = savedMode;
        playlist.setMode(savedMode);
    }
    
    const savedLoop = localStorage.getItem('bardicTunes_loop');
    if (savedLoop === 'true') {
        elements.btnLoop.classList.add('active');
    }
    
    // Mensaje de bienvenida en consola
    console.log('%c🎶 Bardic Tunes - Reproductor de Música para Rol', 
        'font-size: 20px; font-weight: bold; color: #c9a227;');
    console.log('%cQue la música acompañe tus aventuras!', 
        'font-size: 14px; font-style: italic; color: #a8a5a0;');
    
    // Configurar callback cuando se carguen carpetas desde config.js
    configManager.onFolderLoaded = (folderName, files) => {
        console.log(`📁 Carpeta "${folderName}" cargada con ${files.length} archivos`);
        fileExplorer.addFilesFromConfig(files, folderName);
    };
    
    configManager.onAllFoldersLoaded = (allFiles) => {
        if (allFiles.length > 0) {
            console.log(`✅ Total: ${allFiles.length} archivos de música disponibles`);
        }
    };
    
    configManager.onLoadError = (path, error) => {
        console.warn(`⚠️ No se pudo cargar "${path}": ${error.message}`);
    };
    
    // Cargar carpetas desde config.js si hay configuradas
    if (configManager.hasFoldersConfigured()) {
        configManager.loadAllFolders();
    }
    
    // Botón limpiar playlist
    if (elements.btnClearPlaylist) {
        elements.btnClearPlaylist.addEventListener('click', () => {
            playlist.clear();
            fileExplorer.render();
        });
    }
});
