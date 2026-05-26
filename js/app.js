/**
 * App.js - Controlador principal de Bardic Tunes (v2)
 * Nueva arquitectura: partidas + biblioteca + player bar con cola
 */
document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // MÓDULOS
    // ============================================
    const player         = new AudioPlayer();
    const playlist       = new Playlist();
    const campaignMgr    = new CampaignManager();
    const configManager  = new ConfigManager();
    let   fileExplorer   = null;
    let   activeTagFilters = new Set(); // IDs de tags activos como filtro en la biblioteca

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
            return '<li class="campaign-item ' + (isActive ? 'active' : '') + '" data-id="' + c.id + '">' +
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
    }

    function switchCampaign(id) {
        campaignMgr.setActiveCampaign(id);
        playlist.clear();
        activeTagFilters.clear();
        renderCampaignsSidebar();
        renderLibrary();
        if (fileExplorer) fileExplorer.render();
    }

    function startRename(id) {
        const item = el.campaignsList.querySelector('[data-id="' + id + '"] .campaign-item-name');
        if (!item) return;
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
            return;
        }

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

        const rows = tracks.map(function(track, i) {
            const inQueue   = playlist.hasTrack(track.path);
            const isPlaying = track.path === currentPath;
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

            return '<tr class="song-row' + (inQueue ? ' in-queue' : '') + (isPlaying ? ' playing-row' : '') + '" ' +
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

        // Drag desde biblioteca hacia cola
        tbody.querySelectorAll('.song-row').forEach(function(row) {
            row.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('application/bardic-track', row.dataset.path);
                e.dataTransfer.effectAllowed = 'copy';
                row.classList.add('dragging-row');
            });
            row.addEventListener('dragend', function() { row.classList.remove('dragging-row'); });

            // Doble clic → añadir y reproducir
            row.addEventListener('dblclick', function(e) {
                if (e.target.closest('.description-cell') || e.target.closest('.song-actions')) return;
                addTrackToQueueAndPlay(row.dataset.path);
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
        playlist.clear();
        renderCampaignsSidebar();
        renderLibrary();
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
    // INICIALIZACIÓN
    // ============================================

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
});
