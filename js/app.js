/**
 * App.js - Controlador principal de Bardic Tunes (v2)
 * Nueva arquitectura: partidas + biblioteca + player bar con cola
 */

// ============================================
// PASOS DEL TUTORIAL GUIADO
// ============================================
const TUTORIAL_STEPS = [
    {
        icon: '🎶',
        title: '¡Bienvenido a Bardic Tunes!',
        text: 'Tu reproductor de música para ambientar partidas de rol. Te enseñamos lo esencial en menos de un minuto.<br><span class="tutorial-hint">Navega con los botones o con las flechas ← → del teclado.</span>'
    },
    {
        icon: '⚔️',
        title: 'Tus Partidas',
        text: 'Cada partida guarda su propia biblioteca de canciones. Pulsa el botón <strong>＋</strong> para crear una nueva y escribe su nombre. Cambia de una a otra con un clic.',
        target: '.campaigns-sidebar',
        placement: 'right'
    },
    {
        icon: '📂',
        title: 'Añade Canciones',
        text: 'Importa música desde las carpetas de tu ordenador. Las canciones se guardan en la <strong>partida activa</strong>, con su descripción y etiquetas.',
        target: '#btn-add-songs',
        placement: 'below'
    },
    {
        icon: '🎵',
        title: 'La Biblioteca',
        text: 'Aquí ves las canciones de la partida. <strong>Doble clic</strong> para reproducir, edita la descripción en línea y organízalas con <strong>etiquetas</strong>. Usa <strong>Ctrl</strong> o <strong>Shift</strong> + clic para seleccionar varias y aplicar acciones en lote.',
        target: '#song-library',
        placement: 'above'
    },
    {
        icon: '🔍',
        title: 'Busca al Instante',
        text: 'Filtra por nombre, descripción o carpeta para encontrar la pista perfecta justo cuando la necesitas en la mesa.',
        target: '#search-input',
        placement: 'below'
    },
    {
        icon: '▶️',
        title: 'Controles de Reproducción',
        text: 'Play/pausa, anterior y siguiente, y una barra de progreso para saltar a cualquier punto.<br><span class="tutorial-hint"></span>',
        target: '.controls-center',
        placement: 'above'
    },
    {
        icon: '🔊',
        title: 'Volumen y Modo',
        text: 'Ajusta el volumen (↑ ↓ o <strong>M</strong> para silenciar) y elige cómo avanza la cola: <strong>Manual</strong>, <strong>Secuencial</strong> o <strong>Aleatorio</strong>.',
        target: '.controls-right',
        placement: 'above'
    },
    {
        icon: '🎶',
        title: 'La Cola de Reproducción',
        text: '<strong>Arrastra</strong> canciones desde la biblioteca hasta aquí para encolarlas. Reordénalas arrastrando los chips, o quítalas con la ✕.',
        target: '.queue-row',
        placement: 'above'
    },
    {
        icon: '📖',
        title: 'Vuelve cuando quieras',
        text: '¿Te perdiste algo? Pulsa este botón en cualquier momento para repetir el tutorial desde el principio.',
        target: '#btn-tutorial',
        placement: 'below'
    },
    {
        icon: '✨',
        title: '¡Listo para la aventura!',
        text: 'Crea tu primera partida, añade música y que las melodías acompañen tus sesiones.<br><span class="tutorial-hint">🎲 ¡Tirad iniciativa!</span>'
    }
];

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // MÓDULOS
    // ============================================
    const player         = new AudioPlayer();
    const playlist       = new Playlist();
    const campaignMgr    = new CampaignManager();
    const configManager  = new ConfigManager();
    const userMgr        = new UserManager();
    const tutorial       = new Tutorial(TUTORIAL_STEPS);
    let   fileExplorer   = null;
    let   activeTagFilters = new Set(); // IDs de tags activos como filtro en la biblioteca
    let   selectedPaths    = new Set(); // Rutas de canciones seleccionadas (selección múltiple)
    let   visibleTrackPaths = [];       // Rutas visibles tras filtros (orden de la tabla), para selección por rango
    let   lastClickedPath  = null;      // Última fila marcada, para selección con Shift

    // ============================================
    // ELEMENTOS DEL DOM
    // ============================================
    const el = {
        btnNewCampaign:  document.getElementById('btn-new-campaign'),
        campaignsList:   document.getElementById('campaigns-list'),
        campaignTitle:   document.getElementById('campaign-title'),
        libraryStats:    document.getElementById('library-stats'),
        searchInput:     document.getElementById('search-input'),
        btnAddSongs:     document.getElementById('btn-add-songs'),
        songLibrary:     document.getElementById('song-library'),
        selectionBar:    document.getElementById('selection-bar'),
        trackTitle:      document.getElementById('track-title'),
        trackFolder:     document.getElementById('track-folder'),
        timeCurrent:     document.getElementById('time-current'),
        timeDuration:    document.getElementById('time-duration'),
        progressBar:     document.getElementById('progress-bar'),
        progressFill:    document.getElementById('progress-fill'),
        progressHandle:  document.getElementById('progress-handle'),
        btnPlay:         document.getElementById('btn-play'),
        btnPrev:         document.getElementById('btn-prev'),
        btnNext:         document.getElementById('btn-next'),
        btnShuffle:      document.getElementById('btn-shuffle'),
        btnLoop:         document.getElementById('btn-loop'),
        btnMute:         document.getElementById('btn-mute'),
        volumeSlider:    document.getElementById('volume-slider'),
        playbackMode:    document.getElementById('playback-mode'),
        queueBar:        document.getElementById('queue-bar'),
        queueCount:      document.getElementById('queue-count'),
        btnClearQueue:   document.getElementById('btn-clear-queue'),
        modal:           document.getElementById('file-explorer-modal'),
        modalClose:      document.getElementById('modal-close'),
        modalLoadFolder: document.getElementById('modal-load-folder'),
        modalFolderInput:document.getElementById('modal-folder-input'),
        modalFileTree:   document.getElementById('modal-file-tree'),
    };

    // ============================================
    // CALLBACKS DEL PLAYER
    // ============================================
    player.onTrackLoaded = (info) => {
        el.trackTitle.textContent   = info.title;
        el.trackFolder.textContent  = info.folder || '';
        el.timeDuration.textContent = AudioPlayer.formatTime(info.duration);
    };

    player.onTimeUpdate = (info) => {
        el.timeCurrent.textContent      = AudioPlayer.formatTime(info.currentTime);
        el.progressFill.style.width     = info.progress + '%';
        el.progressHandle.style.left    = info.progress + '%';
    };

    player.onPlayStateChange = (isPlaying) => {
        el.btnPlay.textContent = isPlaying ? '⏸️' : '▶️';
        el.btnPlay.title       = isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)';
        renderQueue();
        // Actualizar indicador de onda en la fila activa sin re-renderizar toda la tabla
        const numCell = document.querySelector('.playing-row .col-num');
        if (numCell) {
            if (isPlaying) {
                numCell.innerHTML = '<div class="playing-indicator"><span></span><span></span><span></span><span></span></div>';
            } else {
                const idx = playlist.getCurrentIndex();
                numCell.textContent = String(idx + 1);
            }
        }
    };

    player.onTrackEnd = () => {
        const next = playlist.onTrackEnded();
        if (next) {
            const playable = getPlayableTrack(next);
            player.loadTrack(playable);
            player.play();
        }
    };

    // ============================================
    // CALLBACKS DE PLAYLIST
    // ============================================
    playlist.onTrackChange = (track) => {
        const playable = getPlayableTrack(track);
        player.loadTrack(playable);
        player.play();
        renderQueue();
        renderLibrary();
    };

    playlist.onPlaylistUpdate = () => {
        renderQueue();
        renderLibrary();
    };

    playlist.onModeChange = (mode) => {
        el.playbackMode.value = mode;
        el.btnShuffle.classList.toggle('active', mode === 'shuffle');
    };

    // ============================================
    // FUNCIONES: PARTIDAS
    // ============================================

    function renderCampaignsSidebar() {
        const campaigns = campaignMgr.getCampaigns();
        const activeId  = campaignMgr.activeCampaignId;

        if (campaigns.length === 0) {
            el.campaignsList.innerHTML = '<li class="campaigns-empty"><span>Sin partidas</span><span class="hint">Pulsa ＋ para crear una</span></li>';
            return;
        }

        el.campaignsList.innerHTML = campaigns.map(c => {
            const isActive = c.id === activeId;
            return '<li class="campaign-item ' + (isActive ? 'active' : '') + '" data-id="' + c.id + '" draggable="true">' +
                '<div class="campaign-item-inner">' +
                '<span class="campaign-item-name" title="' + escapeHtml(c.name) + '">' + escapeHtml(c.name) + '</span>' +
                '<div class="campaign-item-actions">' +
                '<button class="btn-campaign-action btn-rename" data-id="' + c.id + '" title="Renombrar">✏️</button>' +
                '<button class="btn-campaign-action btn-delete" data-id="' + c.id + '" title="Eliminar">🗑️</button>' +
                '</div></div>' +
                '<div class="campaign-track-count">' + c.tracks.length + ' canciones</div>' +
                '</li>';
        }).join('');

        el.campaignsList.querySelectorAll('.campaign-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.campaign-item-actions')) return;
                if (e.target.contentEditable === 'true') return;
                switchCampaign(item.dataset.id);
            });
        });

        el.campaignsList.querySelectorAll('.btn-rename').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); startRename(btn.dataset.id); });
        });

        el.campaignsList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const c = campaignMgr.getCampaignById(btn.dataset.id);
                if (c && confirm('¿Eliminar la partida "' + c.name + '"? Se borrarán sus canciones guardadas.')) {
                    campaignMgr.deleteCampaign(btn.dataset.id);
                    renderCampaignsSidebar();
                    renderLibrary();
                }
            });
        });

        // Reordenar partidas arrastrando
        let draggedId = null;
        el.campaignsList.querySelectorAll('.campaign-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedId = item.dataset.id;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                el.campaignsList.querySelectorAll('.campaign-item').forEach(i =>
                    i.classList.remove('drag-over-top', 'drag-over-bottom'));
                draggedId = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (item.dataset.id === draggedId) return;
                const rect = item.getBoundingClientRect();
                const after = e.clientY > rect.top + rect.height / 2;
                item.classList.toggle('drag-over-top', !after);
                item.classList.toggle('drag-over-bottom', after);
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedId || item.dataset.id === draggedId) return;
                const rect = item.getBoundingClientRect();
                const after = e.clientY > rect.top + rect.height / 2;
                const list = campaignMgr.getCampaigns();
                let toIndex = list.findIndex(c => c.id === item.dataset.id);
                if (after) toIndex++;
                // Compensar el hueco que deja el elemento arrastrado si va por delante
                const fromIndex = list.findIndex(c => c.id === draggedId);
                if (fromIndex < toIndex) toIndex--;
                campaignMgr.reorderCampaign(draggedId, toIndex);
                renderCampaignsSidebar();
            });
        });
    }

    function switchCampaign(id) {
        campaignMgr.setActiveCampaign(id);
        // La cola NO se vacía: las canciones añadidas desde otras partidas
        // se mantienen en la cola al cambiar de partida.
        activeTagFilters.clear();
        selectedPaths.clear();
        lastClickedPath = null;
        renderCampaignsSidebar();
        renderLibrary();
        renderQueue();
        if (fileExplorer) fileExplorer.render();
    }

    function startRename(id) {
        const item = el.campaignsList.querySelector('[data-id="' + id + '"] .campaign-item-name');
        if (!item) return;
        // Desactivar el arrastre mientras se edita para no interferir con la selección de texto
        const li = item.closest('.campaign-item');
        if (li) li.draggable = false;
        item.contentEditable = 'true';
        item.focus();
        const range = document.createRange();
        range.selectNodeContents(item);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        const save = () => {
            item.contentEditable = 'false';
            const name = item.textContent.trim();
            campaignMgr.renameCampaign(id, name || 'Partida sin nombre');
            renderCampaignsSidebar();
            if (campaignMgr.activeCampaignId === id) {
                el.campaignTitle.textContent = campaignMgr.getActiveCampaign()?.name || '';
            }
        };

        item.addEventListener('blur', save, { once: true });
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); item.blur(); }
            if (e.key === 'Escape') {
                item.textContent = campaignMgr.getCampaignById(id)?.name || '';
                item.blur();
            }
        }, { once: true });
    }

    // ============================================
    // FUNCIONES: BIBLIOTECA
    // ============================================

    function renderLibrary() {
        renderTagsBar();
        const campaign = campaignMgr.getActiveCampaign();

        if (!campaign) {
            el.campaignTitle.textContent = 'Selecciona una partida';
            el.libraryStats.textContent  = '';
            el.searchInput.disabled      = true;
            el.btnAddSongs.disabled      = true;
            el.songLibrary.innerHTML     = '<div class="library-empty-state"><span class="empty-icon">⚔️</span><p>Sin partida activa</p><p class="hint">Crea o selecciona una partida en el panel izquierdo</p></div>';
            selectedPaths.clear();
            renderSelectionBar();
            return;
        }

        // Eliminar de la selección las rutas que ya no existan en la partida
        const validPaths = new Set(campaign.tracks.map(function(t) { return t.path; }));
        Array.from(selectedPaths).forEach(function(p) { if (!validPaths.has(p)) selectedPaths.delete(p); });
        renderSelectionBar();

        el.campaignTitle.textContent = campaign.name;
        el.searchInput.disabled      = false;
        el.btnAddSongs.disabled      = false;

        const query  = el.searchInput.value.toLowerCase().trim();
        let tracks   = campaign.tracks;

        if (query) {
            tracks = tracks.filter(t =>
                t.name.toLowerCase().includes(query) ||
                (t.description || '').toLowerCase().includes(query) ||
                (t.folder || '').toLowerCase().includes(query)
            );
        }

        if (activeTagFilters.size > 0) {
            tracks = tracks.filter(t =>
                (t.tags || []).some(function(id) { return activeTagFilters.has(id); })
            );
        }

        el.libraryStats.textContent = (query || activeTagFilters.size > 0)
            ? tracks.length + ' de ' + campaign.tracks.length + ' canciones'
            : campaign.tracks.length + ' canciones';

        if (campaign.tracks.length === 0) {
            el.songLibrary.innerHTML = '<div class="library-empty-state"><span class="empty-icon">🎵</span><p>Esta partida no tiene canciones</p><p class="hint">Pulsa "Añadir Canciones" para importar desde tus carpetas</p></div>';
            return;
        }

        if (tracks.length === 0) {
            el.songLibrary.innerHTML = '<div class="library-empty-state"><span class="empty-icon">🔍</span><p>Sin resultados para "' + escapeHtml(query) + '"</p></div>';
            return;
        }

        const currentPath = playlist.getCurrentTrack()?.path;
        visibleTrackPaths = tracks.map(function(t) { return t.path; });

        const rows = tracks.map(function(track, i) {
            const inQueue   = playlist.hasTrack(track.path);
            const isPlaying = track.path === currentPath;
            const isSelected = selectedPaths.has(track.path);
            const queueIdx  = inQueue ? playlist.getTracks().findIndex(function(t) { return t.path === track.path; }) + 1 : null;

            const numCell = isPlaying && player.isPlaying
                ? '<div class="playing-indicator"><span></span><span></span><span></span><span></span></div>'
                : String(i + 1);

            const badge   = inQueue ? '<span class="queue-badge">#' + queueIdx + '</span>' : '';
            const folder  = track.folder ? '<div class="song-folder">' + escapeHtml(track.folder) + '</div>' : '';
            const descVal = escapeHtml(track.description || '');
            const isEmpty = !track.description ? 'empty' : '';

            // Tags de la pista
            const campaignTags = campaign.tags || [];
            const trackTagIds  = track.tags || [];
            const tagPills = trackTagIds
                .map(function(id) { return campaignTags.find(function(t) { return t.id === id; }); })
                .filter(Boolean)
                .map(function(tag) {
                    return '<span class="tag-pill" style="background:' + tag.color + '" title="' + escapeHtml(tag.name) + '">' + escapeHtml(tag.name) + '</span>';
                }).join('');
            const tagsHtml = '<div class="song-tags-row">' + tagPills +
                '<button class="btn-add-tag" data-path="' + escapeHtml(track.path) + '" title="Gestionar tags">🏷️</button>' +
                '</div>';

            return '<tr class="song-row' + (inQueue ? ' in-queue' : '') + (isPlaying ? ' playing-row' : '') + (isSelected ? ' selected' : '') + '" ' +
                'draggable="true" data-path="' + escapeHtml(track.path) + '">' +
                '<td class="col-num">' + numCell + '</td>' +
                '<td><div class="song-name-cell">' +
                '<span class="song-icon">🎵</span>' +
                '<div><div class="song-name" title="' + escapeHtml(track.name) + '">' + escapeHtml(track.displayName || track.name) + '</div>' + folder + tagsHtml + '</div>' +
                badge + '</div></td>' +
                '<td><div class="description-cell ' + isEmpty + '" contenteditable="false" ' +
                'data-path="' + escapeHtml(track.path) + '" data-placeholder="Añade una descripción..." ' +
                'spellcheck="false">' + descVal + '</div></td>' +
                '<td><div class="song-actions">' +
                '<button class="btn-song-action btn-add-queue" data-path="' + escapeHtml(track.path) + '" title="' + (inQueue ? 'Ya en la cola' : 'Añadir a la cola') + '">' + (inQueue ? '🎶' : '➕') + '</button>' +
                '<button class="btn-song-action btn-remove-song" data-path="' + escapeHtml(track.path) + '" title="Quitar de la partida">🗑️</button>' +
                '</div></td>' +
                '</tr>';
        });

        el.songLibrary.innerHTML = '<table class="song-table">' +
            '<thead class="song-table-header"><tr>' +
            '<th class="col-num">#</th>' +
            '<th class="col-name">Canción</th>' +
            '<th class="col-desc">Descripción</th>' +
            '<th class="col-actions">Acciones</th>' +
            '</tr></thead>' +
            '<tbody id="song-tbody">' + rows.join('') + '</tbody>' +
            '</table>';

        attachLibraryListeners(campaign);
    }

    function attachLibraryListeners(campaign) {
        const tbody = document.getElementById('song-tbody');
        if (!tbody) return;

        // Selección de filas estilo explorador de archivos:
        //   clic = seleccionar solo esta · Ctrl/Cmd+clic = añadir/quitar · Shift+clic = rango
        tbody.querySelectorAll('.song-row').forEach(function(row) {
            row.addEventListener('click', function(e) {
                // Ignorar clics sobre zonas con su propia acción
                if (e.target.closest('.description-cell') ||
                    e.target.closest('.song-actions') ||
                    e.target.closest('.song-tags-row')) return;

                var path = row.dataset.path;
                if (e.ctrlKey || e.metaKey) {
                    if (selectedPaths.has(path)) selectedPaths.delete(path);
                    else selectedPaths.add(path);
                    lastClickedPath = path;
                } else if (e.shiftKey && lastClickedPath) {
                    var from = visibleTrackPaths.indexOf(lastClickedPath);
                    var to   = visibleTrackPaths.indexOf(path);
                    if (from !== -1 && to !== -1) {
                        var lo = Math.min(from, to), hi = Math.max(from, to);
                        selectedPaths.clear();
                        for (var i = lo; i <= hi; i++) selectedPaths.add(visibleTrackPaths[i]);
                    } else {
                        selectedPaths.clear();
                        selectedPaths.add(path);
                        lastClickedPath = path;
                    }
                    // Evitar que Shift deje texto resaltado por la selección del navegador
                    var sel = window.getSelection(); if (sel) sel.removeAllRanges();
                } else {
                    selectedPaths.clear();
                    selectedPaths.add(path);
                    lastClickedPath = path;
                }
                updateSelectionUI();
            });
        });

        // Reordenar canciones solo tiene sentido con la lista completa (sin filtro)
        var canReorder = !el.searchInput.value.trim() && activeTagFilters.size === 0;
        var draggedPath = null;

        // Drag desde biblioteca hacia cola (y, sin filtro, para reordenar dentro de la partida)
        tbody.querySelectorAll('.song-row').forEach(function(row) {
            row.addEventListener('dragstart', function(e) {
                draggedPath = row.dataset.path;
                e.dataTransfer.setData('application/bardic-track', row.dataset.path);
                // 'move' si reordenamos dentro de la biblioteca; la cola lo trata como copia igualmente
                e.dataTransfer.effectAllowed = canReorder ? 'copyMove' : 'copy';
                row.classList.add('dragging-row');
            });
            row.addEventListener('dragend', function() {
                row.classList.remove('dragging-row');
                tbody.querySelectorAll('.song-row').forEach(function(r) {
                    r.classList.remove('drag-over-top', 'drag-over-bottom');
                });
                draggedPath = null;
            });

            // Doble clic → añadir y reproducir
            row.addEventListener('dblclick', function(e) {
                if (e.target.closest('.description-cell') || e.target.closest('.song-actions')) return;
                addTrackToQueueAndPlay(row.dataset.path);
            });

            if (!canReorder) return;

            row.addEventListener('dragover', function(e) {
                if (!draggedPath || row.dataset.path === draggedPath) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                var rect = row.getBoundingClientRect();
                var after = e.clientY > rect.top + rect.height / 2;
                row.classList.toggle('drag-over-top', !after);
                row.classList.toggle('drag-over-bottom', after);
            });

            row.addEventListener('dragleave', function() {
                row.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            row.addEventListener('drop', function(e) {
                if (!draggedPath || row.dataset.path === draggedPath) return;
                e.preventDefault();
                e.stopPropagation();
                var rect = row.getBoundingClientRect();
                var after = e.clientY > rect.top + rect.height / 2;
                var allTracks = campaign.tracks;
                var toIndex   = allTracks.findIndex(function(t) { return t.path === row.dataset.path; });
                if (after) toIndex++;
                var fromIndex = allTracks.findIndex(function(t) { return t.path === draggedPath; });
                if (fromIndex < toIndex) toIndex--;
                campaignMgr.reorderTrack(campaign.id, draggedPath, toIndex);
                renderLibrary();
            });
        });

        // Descripción inline edit
        tbody.querySelectorAll('.description-cell').forEach(function(cell) {
            cell.addEventListener('click', function() {
                if (cell.contentEditable === 'true') return;
                cell.contentEditable = 'true';
                cell.classList.add('editing');
                cell.classList.remove('empty');
                cell.focus();
                const range = document.createRange();
                range.selectNodeContents(cell);
                range.collapse(false);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
            });

            const saveDesc = function() {
                cell.contentEditable = 'false';
                cell.classList.remove('editing');
                const newDesc = cell.textContent.trim();
                cell.classList.toggle('empty', !newDesc);
                campaignMgr.updateTrackDescription(campaign.id, cell.dataset.path, newDesc);
            };

            cell.addEventListener('blur', saveDesc);
            cell.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cell.blur(); }
                if (e.key === 'Escape') {
                    var orig = campaign.tracks.find(function(t) { return t.path === cell.dataset.path; });
                    cell.textContent = orig ? (orig.description || '') : '';
                    cell.blur();
                }
            });
        });

        // Botón añadir a cola
        tbody.querySelectorAll('.btn-add-queue').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                addTrackToQueue(btn.dataset.path);
            });
        });

        // Botón eliminar de partida
        tbody.querySelectorAll('.btn-remove-song').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var path = btn.dataset.path;
                campaignMgr.removeTrack(campaign.id, path);
                playlist.removeTrackByPath(path);
                if (fileExplorer) fileExplorer.render();
                renderLibrary();
                renderQueue();
                renderCampaignsSidebar();
            });
        });

        // Botón gestionar tags
        tbody.querySelectorAll('.btn-add-tag').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                openTagPicker(btn, btn.dataset.path, campaign);
            });
        });
    }

    // ============================================
    // FUNCIONES: SELECCIÓN MÚLTIPLE
    // ============================================

    function renderSelectionBar() {
        var count = selectedPaths.size;
        if (count === 0) {
            el.selectionBar.classList.add('hidden');
            el.selectionBar.innerHTML = '';
            return;
        }
        el.selectionBar.classList.remove('hidden');
        el.selectionBar.innerHTML =
            '<div class="selection-bar-inner">' +
            '<span class="selection-count">' + count + ' seleccionada' + (count !== 1 ? 's' : '') + '</span>' +
            '<button class="btn-sel btn-sel-queue" id="btn-sel-queue">➕ Añadir a la cola</button>' +
            '<button class="btn-sel btn-sel-tag" id="btn-sel-tag">🏷️ Añadir tag</button>' +
            '<button class="btn-sel btn-sel-delete" id="btn-sel-delete">🗑️ Eliminar</button>' +
            '<button class="btn-sel btn-sel-clear" id="btn-sel-clear">✕ Quitar selección</button>' +
            '</div>';

        document.getElementById('btn-sel-queue').addEventListener('click', bulkAddToQueue);
        document.getElementById('btn-sel-tag').addEventListener('click', function(e) {
            e.stopPropagation();
            openBulkTagPicker(e.currentTarget);
        });
        document.getElementById('btn-sel-delete').addEventListener('click', bulkDelete);
        document.getElementById('btn-sel-clear').addEventListener('click', clearSelection);
    }

    function clearSelection() {
        selectedPaths.clear();
        lastClickedPath = null;
        updateSelectionUI();
    }

    // Refresca el resaltado de las filas seleccionadas y la barra de acciones
    // sin reconstruir toda la tabla (preserva el doble clic, el drag, etc.)
    function updateSelectionUI() {
        var tbody = document.getElementById('song-tbody');
        if (tbody) {
            tbody.querySelectorAll('.song-row').forEach(function(row) {
                row.classList.toggle('selected', selectedPaths.has(row.dataset.path));
            });
        }
        renderSelectionBar();
    }

    function bulkAddToQueue() {
        var campaign = campaignMgr.getActiveCampaign();
        if (!campaign) return;
        // Respetar el orden de la biblioteca al encolar
        var toAdd = campaign.tracks
            .filter(function(t) { return selectedPaths.has(t.path); })
            .map(function(t) { return getPlayableTrack(t); });
        if (toAdd.length === 0) return;
        playlist.addTracks(toAdd, false); // dispara onPlaylistUpdate (cola + biblioteca)
    }

    function bulkDelete() {
        var campaign = campaignMgr.getActiveCampaign();
        if (!campaign) return;
        var count = selectedPaths.size;
        if (count === 0) return;
        if (!confirm('¿Eliminar ' + count + ' canción(es) de la partida? También se quitarán de la cola.')) return;
        Array.from(selectedPaths).forEach(function(path) {
            campaignMgr.removeTrack(campaign.id, path);
            playlist.removeTrackByPath(path);
        });
        selectedPaths.clear();
        lastClickedPath = null;
        if (fileExplorer) fileExplorer.render();
        renderLibrary();
        renderQueue();
        renderCampaignsSidebar();
    }

    function openBulkTagPicker(btn) {
        closeTagPicker();
        var campaign = campaignMgr.getActiveCampaign();
        if (!campaign) return;
        var rect   = btn.getBoundingClientRect();
        var picker = document.createElement('div');
        picker.className = 'tag-picker';
        picker.id        = 'active-tag-picker';
        picker.style.left = rect.left + 'px';
        picker.style.top  = (rect.bottom + 4) + 'px';

        // Pistas seleccionadas (para saber qué tags comparten todas)
        var selectedTracks = campaign.tracks.filter(function(t) { return selectedPaths.has(t.path); });
        var sharedByAll = function(tagId) {
            return selectedTracks.length > 0 &&
                selectedTracks.every(function(t) { return (t.tags || []).includes(tagId); });
        };

        var campaignTags = campaign.tags || [];
        var html = '';
        if (campaignTags.length === 0) {
            html += '<div class="tag-picker-empty">Crea un tag con "+ Tag" en la barra superior.</div>';
        } else {
            html += campaignTags.map(function(tag) {
                var active = sharedByAll(tag.id);
                return '<div class="tag-picker-item' + (active ? ' active' : '') + '" data-tag-id="' + tag.id + '">' +
                    '<span class="tag-dot" style="background:' + tag.color + '"></span>' +
                    '<span class="tag-picker-name">' + escapeHtml(tag.name) + '</span>' +
                    (active ? '<span class="tag-check">✓</span>' : '') +
                    '</div>';
            }).join('');
        }
        html += '<div class="tag-picker-new">' +
            '<input type="text" class="tag-picker-input" placeholder="+ Nuevo tag y asignar..." maxlength="24">' +
            '</div>';
        picker.innerHTML = html;
        document.body.appendChild(picker);

        var pr = picker.getBoundingClientRect();
        if (pr.right  > window.innerWidth  - 8) picker.style.left = Math.max(8, window.innerWidth  - pr.width  - 8) + 'px';
        if (pr.bottom > window.innerHeight - 8) picker.style.top  = Math.max(8, rect.top - pr.height - 4) + 'px';

        // Si todas las seleccionadas ya tienen el tag → se lo quita a todas; si no → se lo pone a todas
        var toggleTagOnSelection = function(tagId) {
            var removeFromAll = sharedByAll(tagId);
            selectedTracks.forEach(function(t) {
                if (removeFromAll) campaignMgr.toggleTagOnTrack(campaign.id, t.path, tagId);
                else               campaignMgr.addTagToTrack(campaign.id, t.path, tagId);
            });
        };

        picker.querySelectorAll('.tag-picker-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleTagOnSelection(item.dataset.tagId);
                renderLibrary();
                closeTagPicker();
            });
        });

        var input = picker.querySelector('.tag-picker-input');
        input.addEventListener('keydown', function(e) {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                var name = input.value.trim();
                if (name) {
                    var newTag = campaignMgr.createTag(campaign.id, name);
                    if (newTag) selectedTracks.forEach(function(t) {
                        campaignMgr.addTagToTrack(campaign.id, t.path, newTag.id);
                    });
                }
                renderLibrary();
                closeTagPicker();
            }
            if (e.key === 'Escape') { e.preventDefault(); closeTagPicker(); }
        });
        input.addEventListener('click', function(e) { e.stopPropagation(); });

        setTimeout(function() {
            document.addEventListener('click', closeTagPicker, { once: true });
        }, 0);
    }

    // ============================================
    // FUNCIONES: TAGS
    // ============================================

    function renderTagsBar() {
        var tagsBar  = document.getElementById('tags-bar');
        if (!tagsBar) return;
        var campaign = campaignMgr.getActiveCampaign();

        if (!campaign) {
            tagsBar.classList.add('hidden');
            tagsBar.innerHTML = '';
            return;
        }

        tagsBar.classList.remove('hidden');
        var tags = campaign.tags || [];

        var chips = tags.map(function(tag) {
            var isActive = activeTagFilters.has(tag.id);
            return '<span class="tag-chip' + (isActive ? ' active' : '') + '" ' +
                'data-tag-id="' + tag.id + '" style="--tag-color:' + tag.color + '">' +
                escapeHtml(tag.name) +
                '<button class="tag-del" data-tag-id="' + tag.id + '" title="Eliminar tag">✕</button>' +
                '</span>';
        }).join('');

        var clearBtn = activeTagFilters.size > 0
            ? '<button class="btn-clear-tag-filter" id="btn-clear-tag-filter" title="Quitar filtros de tag">✕ Todos</button>'
            : '';

        tagsBar.innerHTML = '<div class="tags-bar-inner">' +
            '<span class="tags-bar-label">🏷️</span>' +
            chips + clearBtn +
            '<button class="btn-new-tag" id="btn-new-tag" title="Crear nuevo tag">+ Tag</button>' +
            '</div>';

        // Filtrar al hacer clic en un chip
        tagsBar.querySelectorAll('.tag-chip').forEach(function(chip) {
            chip.addEventListener('click', function(e) {
                if (e.target.closest('.tag-del')) return;
                var tagId = chip.dataset.tagId;
                if (activeTagFilters.has(tagId)) activeTagFilters.delete(tagId);
                else activeTagFilters.add(tagId);
                renderLibrary();
            });
        });

        // Eliminar tag
        tagsBar.querySelectorAll('.tag-del').forEach(function(delBtn) {
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var tagId  = delBtn.dataset.tagId;
                var tag    = tags.find(function(t) { return t.id === tagId; });
                if (!tag) return;
                var usedBy = campaign.tracks.filter(function(t) { return (t.tags || []).includes(tagId); }).length;
                var msg    = usedBy > 0
                    ? '¿Eliminar "' + tag.name + '"? Se quitará de ' + usedBy + ' canción(es).'
                    : '¿Eliminar el tag "' + tag.name + '"?';
                if (confirm(msg)) {
                    campaignMgr.deleteTag(campaign.id, tagId);
                    activeTagFilters.delete(tagId);
                    renderLibrary();
                }
            });
        });

        // Quitar todos los filtros activos
        var clearBtnEl = document.getElementById('btn-clear-tag-filter');
        if (clearBtnEl) {
            clearBtnEl.addEventListener('click', function() {
                activeTagFilters.clear();
                renderLibrary();
            });
        }

        // Crear nuevo tag (inline input)
        var btnNewTag = document.getElementById('btn-new-tag');
        if (btnNewTag) {
            btnNewTag.addEventListener('click', function() {
                var inner = tagsBar.querySelector('.tags-bar-inner');
                if (inner.querySelector('.tag-new-input')) return;
                var inputEl = document.createElement('input');
                inputEl.type        = 'text';
                inputEl.className   = 'tag-new-input';
                inputEl.placeholder = 'Nombre del tag...';
                inputEl.maxLength   = 24;
                btnNewTag.replaceWith(inputEl);
                inputEl.focus();
                var saveTag = function() {
                    var name = inputEl.value.trim();
                    if (name) campaignMgr.createTag(campaign.id, name);
                    renderLibrary();
                };
                inputEl.addEventListener('blur', saveTag);
                inputEl.addEventListener('keydown', function(e) {
                    e.stopPropagation();
                    if (e.key === 'Enter') { e.preventDefault(); inputEl.blur(); }
                    if (e.key === 'Escape') { inputEl.value = ''; inputEl.blur(); }
                });
            });
        }
    }

    function closeTagPicker() {
        var existing = document.getElementById('active-tag-picker');
        if (existing) existing.remove();
    }

    function openTagPicker(btn, trackPath, campaign) {
        closeTagPicker();
        var rect   = btn.getBoundingClientRect();
        var picker = document.createElement('div');
        picker.className = 'tag-picker';
        picker.id        = 'active-tag-picker';
        picker.style.left = rect.left + 'px';
        picker.style.top  = (rect.bottom + 4) + 'px';

        var campaignTags = campaign.tags || [];
        var track        = campaign.tracks.find(function(t) { return t.path === trackPath; });
        var trackTagIds  = track ? (track.tags || []) : [];

        var html = '';
        if (campaignTags.length === 0) {
            html += '<div class="tag-picker-empty">Crea un tag con "+ Tag" en la barra superior.</div>';
        } else {
            html += campaignTags.map(function(tag) {
                var active = trackTagIds.includes(tag.id);
                return '<div class="tag-picker-item' + (active ? ' active' : '') + '" data-tag-id="' + tag.id + '">' +
                    '<span class="tag-dot" style="background:' + tag.color + '"></span>' +
                    '<span class="tag-picker-name">' + escapeHtml(tag.name) + '</span>' +
                    (active ? '<span class="tag-check">✓</span>' : '') +
                    '</div>';
            }).join('');
        }

        html += '<div class="tag-picker-new">' +
            '<input type="text" class="tag-picker-input" placeholder="+ Nuevo tag y asignar..." maxlength="24">' +
            '</div>';

        picker.innerHTML = html;
        document.body.appendChild(picker);

        // Ajustar posición si se sale del viewport
        var pr = picker.getBoundingClientRect();
        if (pr.right  > window.innerWidth  - 8) picker.style.left = Math.max(8, window.innerWidth  - pr.width  - 8) + 'px';
        if (pr.bottom > window.innerHeight - 8) picker.style.top  = Math.max(8, rect.top - pr.height - 4) + 'px';

        // Toggle tag existente
        picker.querySelectorAll('.tag-picker-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                campaignMgr.toggleTagOnTrack(campaign.id, trackPath, item.dataset.tagId);
                renderLibrary();
                closeTagPicker();
            });
        });

        // Crear nuevo tag y asignarlo directamente
        var input = picker.querySelector('.tag-picker-input');
        input.addEventListener('keydown', function(e) {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                var name = input.value.trim();
                if (name) {
                    var newTag = campaignMgr.createTag(campaign.id, name);
                    if (newTag) campaignMgr.addTagToTrack(campaign.id, trackPath, newTag.id);
                }
                renderLibrary();
                closeTagPicker();
            }
            if (e.key === 'Escape') { e.preventDefault(); closeTagPicker(); }
        });
        input.addEventListener('click', function(e) { e.stopPropagation(); });

        // Cerrar al hacer clic fuera
        setTimeout(function() {
            document.addEventListener('click', closeTagPicker, { once: true });
        }, 0);
    }

    // ============================================
    // FUNCIONES: COLA
    // ============================================

    function renderQueue() {
        const tracks = playlist.getTracks();
        const ci     = playlist.getCurrentIndex();

        el.queueCount.textContent = tracks.length > 0
            ? tracks.length + ' canción' + (tracks.length !== 1 ? 'es' : '')
            : 'vacía';

        if (tracks.length === 0) {
            el.queueBar.innerHTML = '<span class="queue-drop-hint">Arrastra canciones desde la biblioteca para añadirlas a la cola</span>';
            return;
        }

        el.queueBar.innerHTML = tracks.map(function(track, i) {
            const isPlaying = i === ci;
            const chipIcon  = isPlaying && player.isPlaying
                ? '<span class="playing-indicator" style="height:12px"><span></span><span></span><span></span></span>'
                : '🎵';
            return '<div class="queue-chip' + (isPlaying ? ' playing-chip' : '') + '" ' +
                'data-index="' + i + '" data-path="' + escapeHtml(track.path) + '" draggable="true" ' +
                'title="' + escapeHtml(track.name) + '">' +
                '<span class="chip-icon">' + chipIcon + '</span>' +
                '<span class="chip-name">' + escapeHtml(track.displayName || track.name) + '</span>' +
                '<button class="chip-remove" data-path="' + escapeHtml(track.path) + '" title="Quitar">✕</button>' +
                '</div>';
        }).join('');

        attachQueueListeners();
    }

    function attachQueueListeners() {
        el.queueBar.querySelectorAll('.queue-chip').forEach(function(chip) {
            // Clic → reproducir
            chip.addEventListener('click', function(e) {
                if (e.target.closest('.chip-remove')) return;
                playlist.playTrack(parseInt(chip.dataset.index));
            });

            // Quitar
            chip.querySelector('.chip-remove').addEventListener('click', function(e) {
                e.stopPropagation();
                playlist.removeTrackByPath(chip.dataset.path);
            });

            // Drag para reordenar dentro de la cola
            chip.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('application/bardic-queue-index', chip.dataset.index);
                e.dataTransfer.effectAllowed = 'move';
                chip.classList.add('dragging-chip');
            });
            chip.addEventListener('dragend', function() { chip.classList.remove('dragging-chip'); });

            chip.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                chip.classList.add('drag-over-chip');
            });
            chip.addEventListener('dragleave', function() { chip.classList.remove('drag-over-chip'); });

            chip.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                chip.classList.remove('drag-over-chip');

                var fromIdx = e.dataTransfer.getData('application/bardic-queue-index');
                if (fromIdx !== '') {
                    var from = parseInt(fromIdx);
                    var to   = parseInt(chip.dataset.index);
                    if (!isNaN(from) && from !== to) playlist.moveTrack(from, to);
                } else {
                    var path = e.dataTransfer.getData('application/bardic-track');
                    if (path) addTrackToQueue(path);
                }
            });
        });
    }

    // ============================================
    // HELPERS DE TRACKS
    // ============================================

    function getPlayableTrack(campaignTrack) {
        var explorerFile = fileExplorer
            ? fileExplorer.files.find(function(f) { return f.path === campaignTrack.path; })
            : null;
        return Object.assign({}, campaignTrack, {
            file: explorerFile ? explorerFile.file : null,
            displayName: campaignTrack.displayName || campaignTrack.name
        });
    }

    function addTrackToQueue(path) {
        var campaign = campaignMgr.getActiveCampaign();
        if (!campaign) return;
        var track = campaign.tracks.find(function(t) { return t.path === path; });
        if (!track) return;
        playlist.addTrack(getPlayableTrack(track));
    }

    function addTrackToQueueAndPlay(path) {
        addTrackToQueue(path);
        var idx = playlist.getTracks().findIndex(function(t) { return t.path === path; });
        if (idx !== -1) playlist.playTrack(idx);
    }

    // ============================================
    // MODAL: EXPLORADOR DE ARCHIVOS
    // ============================================

    function initFileExplorer() {
        fileExplorer = new FileExplorer(el.modalFileTree);

        fileExplorer.checkInPlaylist = function(path) {
            var campaign = campaignMgr.getActiveCampaign();
            return campaign ? campaignMgr.hasTrack(campaign.id, path) : false;
        };

        fileExplorer.onAddTrack = function(track) {
            var campaign = campaignMgr.getActiveCampaign();
            if (!campaign) return;
            campaignMgr.addTracks(campaign.id, [track]);
            fileExplorer.render();
            renderLibrary();
            renderCampaignsSidebar();
        };

        fileExplorer.onRemoveTrack = function(track) {
            var campaign = campaignMgr.getActiveCampaign();
            if (!campaign) return;
            campaignMgr.removeTrack(campaign.id, track.path);
            playlist.removeTrackByPath(track.path);
            fileExplorer.render();
            renderLibrary();
            renderCampaignsSidebar();
        };

        fileExplorer.onAddFolder = function(folderPath, files) {
            var campaign = campaignMgr.getActiveCampaign();
            if (!campaign) return;
            campaignMgr.addTracks(campaign.id, files);
            fileExplorer.render();
            renderLibrary();
            renderCampaignsSidebar();
        };

        fileExplorer.onRemoveFolder = function(folderPath, files) {
            var campaign = campaignMgr.getActiveCampaign();
            if (!campaign) return;
            files.forEach(function(f) {
                campaignMgr.removeTrack(campaign.id, f.path);
                playlist.removeTrackByPath(f.path);
            });
            fileExplorer.render();
            renderLibrary();
            renderCampaignsSidebar();
        };

        fileExplorer.onFilesLoaded = function(files) {
            console.log('📂 ' + files.length + ' archivos cargados en el explorador');
        };

        configManager.onFolderLoaded = function(folderName, files) {
            fileExplorer.addFilesFromConfig(files, folderName);
        };
        configManager.onAllFoldersLoaded = function(all) {
            if (all.length > 0) console.log('✅ ' + all.length + ' archivos de música disponibles');
        };
        if (configManager.hasFoldersConfigured()) configManager.loadAllFolders();
    }

    function openModal() {
        if (!campaignMgr.getActiveCampaign()) return;
        el.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (fileExplorer) fileExplorer.render();
    }

    function closeModal() {
        el.modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    el.btnAddSongs.addEventListener('click', openModal);
    el.modalClose.addEventListener('click', closeModal);
    el.modal.addEventListener('click', function(e) { if (e.target === el.modal) closeModal(); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !el.modal.classList.contains('hidden')) closeModal();
    });

    el.modalLoadFolder.addEventListener('click', function() { el.modalFolderInput.click(); });
    el.modalFolderInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) fileExplorer.processFiles(e.target.files, true);
    });

    // ============================================
    // NUEVA PARTIDA
    // ============================================

    el.btnNewCampaign.addEventListener('click', function() {
        var c = campaignMgr.createCampaign('Nueva Partida');
        campaignMgr.setActiveCampaign(c.id);
        // Se conserva la cola actual al crear una nueva partida.
        selectedPaths.clear();
        lastClickedPath = null;
        renderCampaignsSidebar();
        renderLibrary();
        renderQueue();
        // Entrar inmediatamente en modo rename para que el usuario escriba el nombre
        startRename(c.id);
    });

    el.searchInput.addEventListener('input', renderLibrary);

    // ============================================
    // CONTROLES DE REPRODUCCIÓN
    // ============================================

    el.btnPlay.addEventListener('click', function() {
        if (!player.audio.src && playlist.getCount() > 0) playlist.playTrack(0);
        else player.togglePlay();
    });

    el.btnPrev.addEventListener('click', function() {
        if (player.getCurrentTime() > 3) player.seek(0);
        else playlist.previous();
    });

    el.btnNext.addEventListener('click', function() { playlist.next(); });

    el.btnShuffle.addEventListener('click', function() {
        var newMode = playlist.getMode() === 'shuffle' ? 'sequential' : 'shuffle';
        playlist.setMode(newMode);
    });

    el.btnLoop.addEventListener('click', function() {
        var isLooping = player.toggleLoop();
        el.btnLoop.classList.toggle('active', isLooping);
    });

    el.playbackMode.addEventListener('change', function(e) { playlist.setMode(e.target.value); });

    // ============================================
    // BARRA DE PROGRESO
    // ============================================

    var isDraggingProgress = false;

    function updateProgressFromEvent(e) {
        var rect = el.progressBar.getBoundingClientRect();
        var pct  = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        player.seekToPercent(pct);
    }

    el.progressBar.addEventListener('mousedown', function(e) {
        isDraggingProgress = true;
        player.isSeeking   = true;
        el.progressBar.classList.add('dragging');
        updateProgressFromEvent(e);
    });
    document.addEventListener('mousemove', function(e) { if (isDraggingProgress) updateProgressFromEvent(e); });
    document.addEventListener('mouseup', function() {
        if (isDraggingProgress) {
            isDraggingProgress = false;
            player.isSeeking   = false;
            el.progressBar.classList.remove('dragging');
        }
    });

    // ============================================
    // VOLUMEN
    // ============================================

    el.volumeSlider.addEventListener('input', function(e) {
        var vol = e.target.value / 100;
        player.setVolume(vol);
        updateVolumeIcon(vol);
    });

    el.btnMute.addEventListener('click', function() {
        var muted = player.toggleMute();
        updateVolumeIcon(muted ? 0 : player.getVolume());
    });

    function updateVolumeIcon(vol) {
        if (vol === 0 || player.isMuted) el.btnMute.textContent = '🔇';
        else if (vol < 0.3)              el.btnMute.textContent = '🔈';
        else if (vol < 0.7)              el.btnMute.textContent = '🔉';
        else                             el.btnMute.textContent = '🔊';
    }

    // ============================================
    // DRAG & DROP: BIBLIOTECA → COLA
    // ============================================

    el.queueBar.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (e.dataTransfer.types.includes('application/bardic-track')) {
            el.queueBar.classList.add('drag-over');
        }
    });

    el.queueBar.addEventListener('dragleave', function(e) {
        if (!el.queueBar.contains(e.relatedTarget)) el.queueBar.classList.remove('drag-over');
    });

    el.queueBar.addEventListener('drop', function(e) {
        e.preventDefault();
        el.queueBar.classList.remove('drag-over');
        var path = e.dataTransfer.getData('application/bardic-track');
        if (path) addTrackToQueue(path);
    });

    el.btnClearQueue.addEventListener('click', function() {
        playlist.clear();
        if (fileExplorer) fileExplorer.render();
    });

    // Clic fuera de una canción → deseleccionar (salvo en la barra de acciones o el selector de tags)
    document.addEventListener('click', function(e) {
        if (selectedPaths.size === 0) return;
        if (e.target.closest('.song-row') ||
            e.target.closest('#selection-bar') ||
            e.target.closest('.tag-picker')) return;
        clearSelection();
    });

    // ============================================
    // ATAJOS DE TECLADO
    // ============================================

    document.addEventListener('keydown', function(e) {
        var tag      = e.target.tagName;
        var editable = e.target.contentEditable === 'true';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (!player.audio.src && playlist.getCount() > 0) playlist.playTrack(0);
                else player.togglePlay();
                break;
            case 'ArrowLeft':  e.preventDefault(); player.skip(-5); break;
            case 'ArrowRight': e.preventDefault(); player.skip(5);  break;
            case 'ArrowUp': {
                e.preventDefault();
                var vUp = Math.min(1, player.getVolume() + 0.1);
                player.setVolume(vUp); el.volumeSlider.value = vUp * 100; updateVolumeIcon(vUp);
                break;
            }
            case 'ArrowDown': {
                e.preventDefault();
                var vDn = Math.max(0, player.getVolume() - 0.1);
                player.setVolume(vDn); el.volumeSlider.value = vDn * 100; updateVolumeIcon(vDn);
                break;
            }
            case 'KeyM': {
                e.preventDefault();
                var muted = player.toggleMute();
                updateVolumeIcon(muted ? 0 : player.getVolume());
                break;
            }
            case 'KeyN': e.preventDefault(); playlist.next(); break;
            case 'KeyP':
                e.preventDefault();
                if (player.getCurrentTime() > 3) player.seek(0);
                else playlist.previous();
                break;
        }
    });

    // ============================================
    // UTILIDADES
    // ============================================

    function escapeHtml(text) {
        if (!text) return '';
        var d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    // ============================================
    // AUTH: Pantalla de login
    // ============================================

    function showLoginScreen() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.querySelector('.app-wrapper').classList.add('hidden');
    }

    function hideLoginScreen() {
        document.getElementById('login-screen').classList.add('hidden');
        document.querySelector('.app-wrapper').classList.remove('hidden');
    }

    function showLoginError(msg) {
        var errEl = document.getElementById('login-error');
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
    }

    function hideLoginError() {
        document.getElementById('login-error').classList.add('hidden');
    }

    function initLoginScreen() {
        var loginSection    = document.getElementById('login-form-section');
        var registerSection = document.getElementById('register-form-section');

        // Toggle entre login y registro
        document.getElementById('show-register').addEventListener('click', function() {
            loginSection.classList.add('hidden');
            registerSection.classList.remove('hidden');
            hideLoginError();
        });
        document.getElementById('show-login').addEventListener('click', function() {
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            hideLoginError();
        });

        // Login
        var btnLogin = document.getElementById('btn-login');
        btnLogin.addEventListener('click', async function() {
            var username = document.getElementById('login-username').value.trim();
            var password = document.getElementById('login-password').value;
            if (!username || !password) return showLoginError('Introduce tu nombre y contraseña.');
            hideLoginError();
            btnLogin.disabled = true;
            btnLogin.textContent = 'Entrando...';
            try {
                await userMgr.login(username, password);
                campaignMgr.setToken(userMgr.getToken());
                await campaignMgr.load();
                hideLoginScreen();
                startApp();
            } catch (err) {
                showLoginError(err.message || 'Error al iniciar sesión.');
            } finally {
                btnLogin.disabled = false;
                btnLogin.textContent = 'Entrar al Reino';
            }
        });
        ['login-username', 'login-password'].forEach(function(id) {
            document.getElementById(id).addEventListener('keydown', function(e) {
                if (e.key === 'Enter') document.getElementById('btn-login').click();
            });
        });

        // Registro
        var btnRegister = document.getElementById('btn-register');
        btnRegister.addEventListener('click', async function() {
            var username  = document.getElementById('reg-username').value.trim();
            var password  = document.getElementById('reg-password').value;
            var password2 = document.getElementById('reg-password2').value;
            if (!username || !password) return showLoginError('Rellena todos los campos.');
            if (password !== password2)  return showLoginError('Las contraseñas no coinciden.');
            hideLoginError();
            btnRegister.disabled = true;
            btnRegister.textContent = 'Creando...';
            try {
                await userMgr.register(username, password);
                campaignMgr.setToken(userMgr.getToken());
                await campaignMgr.load();
                hideLoginScreen();
                startApp();
            } catch (err) {
                showLoginError(err.message || 'Error al registrarse.');
            } finally {
                btnRegister.disabled = false;
                btnRegister.textContent = 'Crear Personaje';
            }
        });
        ['reg-username', 'reg-password', 'reg-password2'].forEach(function(id) {
            document.getElementById(id).addEventListener('keydown', function(e) {
                if (e.key === 'Enter') document.getElementById('btn-register').click();
            });
        });
    }

    function startApp() {
        // Mostrar nombre del usuario en el header
        var usernameDisplay = document.getElementById('current-username');
        if (usernameDisplay) usernameDisplay.textContent = userMgr.getUsername();

        // Restaurar preferencias de reproducción
        var savedVol = localStorage.getItem('bardicTunes_volume');
        if (savedVol) { el.volumeSlider.value = parseFloat(savedVol) * 100; updateVolumeIcon(parseFloat(savedVol)); }

        var savedMode = localStorage.getItem('bardicTunes_playbackMode');
        if (savedMode) { el.playbackMode.value = savedMode; playlist.setMode(savedMode); }

        var savedLoop = localStorage.getItem('bardicTunes_loop');
        if (savedLoop === 'true') el.btnLoop.classList.add('active');

        initFileExplorer();
        renderCampaignsSidebar();
        renderLibrary();
        renderQueue();

        console.log('%c🎶 Bardic Tunes v2 — Reproductor de Música para Rol', 'font-size:16px;font-weight:bold;color:#c9a227;');
        console.log('%cQue la música acompañe tus aventuras!', 'font-size:13px;font-style:italic;color:#a8a5a0;');

        // Lanzar el tutorial automáticamente la primera vez que entra este usuario.
        // El estado se guarda por usuario en el servidor (no en localStorage),
        // para que cada cuenta nueva lo vea una vez en cualquier navegador.
        if (!campaignMgr.tutorialSeen) {
            setTimeout(function() { tutorial.start(true); }, 700);
        }
    }

    // Botón de logout
    var btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm('¿Cerrar sesión de ' + userMgr.getUsername() + '?')) userMgr.logout();
        });
    }

    // Al cerrar/terminar el tutorial, recordarlo en el perfil del usuario (servidor)
    tutorial.onEnd = function() { campaignMgr.markTutorialSeen(); };

    // Botón de tutorial: reabre el recorrido guiado desde el principio
    var btnTutorial = document.getElementById('btn-tutorial');
    if (btnTutorial) {
        btnTutorial.addEventListener('click', function() { tutorial.start(true); });
    }

    // ============================================
    // ARRANQUE
    // ============================================

    initLoginScreen();

    if (userMgr.isLoggedIn()) {
        campaignMgr.setToken(userMgr.getToken());
        campaignMgr.load()
            .then(function() { hideLoginScreen(); startApp(); })
            .catch(function() {
                // Token expirado o inválido: borrar sesión y pedir login de nuevo
                userMgr.logout();
            });
    } else {
        showLoginScreen();
    }

});
