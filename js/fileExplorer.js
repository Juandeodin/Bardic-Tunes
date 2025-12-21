/**
 * FileExplorer - Gestión del árbol de archivos
 * Parsea la estructura de carpetas y renderiza el árbol navegable
 */
class FileExplorer {
    constructor(containerElement) {
        this.container = containerElement;
        this.files = [];
        this.folderStructure = {};
        this.supportedFormats = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac', '.webm'];
        
        // Callbacks
        this.onFileSelect = null;
        this.onFilesLoaded = null;
        this.onAddTrack = null;      // callback(track)
        this.onRemoveTrack = null;   // callback(track)
        this.onAddFolder = null;     // callback(folderPath, files[])
        this.onRemoveFolder = null;  // callback(folderPath, files[])
        
        // Estado
        this.selectedFile = null;
        this.expandedFolders = new Set();
        
        // Función para verificar si track está en playlist (se setea desde app.js)
        this.checkInPlaylist = null;
    }
    
    /**
     * Procesa los archivos cargados desde el input
     * @param {FileList} fileList 
     * @param {boolean} append - Si true, añade a los existentes en lugar de reemplazar
     */
    processFiles(fileList, append = false) {
        if (!append) {
            this.files = [];
            this.folderStructure = {};
        }
        
        console.log(`📂 Procesando ${fileList.length} archivos desde navegador...`);
        
        // Filtrar solo archivos de audio soportados
        for (const file of fileList) {
            const ext = this._getExtension(file.name);
            if (this.supportedFormats.includes(ext)) {
                // Obtener la ruta relativa de la carpeta
                // webkitRelativePath puede estar vacío en algunos navegadores
                const relativePath = file.webkitRelativePath || file.name;
                const pathParts = relativePath.split('/');
                const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'Música Local';
                const fileName = pathParts[pathParts.length - 1];
                
                const trackInfo = {
                    file: file,  // Objeto File del navegador - IMPORTANTE para reproducir
                    name: this._cleanFileName(fileName),
                    displayName: this._cleanFileName(fileName),
                    folder: folderPath,
                    path: relativePath,
                    src: null,  // Se creará objectURL al reproducir
                    extension: ext,
                    isLocal: true  // Marca como archivo local del navegador
                };
                
                console.log(`  ✓ ${trackInfo.name} (${folderPath})`);
                
                this.files.push(trackInfo);
                
                // Construir estructura de carpetas
                this._addToFolderStructure(pathParts, trackInfo);
            }
        }
        
        // Ordenar archivos alfabéticamente dentro de cada carpeta
        this._sortFolderStructure(this.folderStructure);
        
        // Renderizar el árbol
        this.render();
        
        // Callback
        if (this.onFilesLoaded) {
            this.onFilesLoaded(this.files);
        }
        
        return this.files;
    }
    
    /**
     * Obtiene la extensión de un archivo
     * @param {string} filename 
     */
    _getExtension(filename) {
        const idx = filename.lastIndexOf('.');
        return idx !== -1 ? filename.slice(idx).toLowerCase() : '';
    }
    
    /**
     * Limpia el nombre del archivo para mostrar
     * @param {string} filename 
     */
    _cleanFileName(filename) {
        // Quitar extensión
        const idx = filename.lastIndexOf('.');
        let name = idx !== -1 ? filename.slice(0, idx) : filename;
        
        // Quitar números de track comunes (01 -, 01., etc.)
        name = name.replace(/^\d{1,3}[\s._-]+/, '');
        
        return name.trim();
    }
    
    /**
     * Añade un archivo a la estructura de carpetas
     * @param {Array} pathParts 
     * @param {Object} trackInfo 
     */
    _addToFolderStructure(pathParts, trackInfo) {
        let current = this.folderStructure;
        
        // Navegar/crear la estructura de carpetas
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!current[part]) {
                current[part] = {
                    _isFolder: true,
                    _name: part,
                    _files: [],
                    _subfolders: {}
                };
            }
            
            if (i === pathParts.length - 2) {
                // Última carpeta, añadir el archivo
                current[part]._files.push(trackInfo);
            } else {
                current = current[part]._subfolders;
            }
        }
    }
    
    /**
     * Ordena la estructura de carpetas alfabéticamente
     * @param {Object} structure 
     */
    _sortFolderStructure(structure) {
        for (const key in structure) {
            if (structure[key]._isFolder) {
                // Ordenar archivos
                structure[key]._files.sort((a, b) => 
                    a.name.localeCompare(b.name, 'es', { numeric: true })
                );
                
                // Ordenar subcarpetas recursivamente
                this._sortFolderStructure(structure[key]._subfolders);
            }
        }
    }
    
    /**
     * Renderiza el árbol de archivos en el contenedor
     */
    render() {
        if (this.files.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🗃️</span>
                    <p>No hay música cargada</p>
                    <p class="hint">Haz clic en "Cargar Música" o configura carpetas en config.js</p>
                </div>
            `;
            return;
        }
        
        const html = this._renderFolder(this.folderStructure, 0);
        this.container.innerHTML = html;
        
        // Añadir event listeners
        this._attachEventListeners();
    }
    
    /**
     * Renderiza una carpeta y su contenido
     * @param {Object} folder 
     * @param {number} level 
     */
    _renderFolder(structure, level) {
        let html = '';
        
        // Obtener carpetas ordenadas
        const folders = Object.keys(structure)
            .filter(key => structure[key]._isFolder)
            .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
        
        for (const folderName of folders) {
            const folder = structure[folderName];
            const folderId = this._generateId(folder._name + level);
            const isExpanded = this.expandedFolders.has(folderId);
            const expandedClass = isExpanded ? '' : 'collapsed';
            const folderPath = folder._files.length > 0 ? folder._files[0].folder : '';
            
            // Contar cuántos archivos de esta carpeta están en playlist
            const filesInPlaylist = folder._files.filter(f => 
                this.checkInPlaylist && this.checkInPlaylist(f.path)
            ).length;
            const allInPlaylist = filesInPlaylist === folder._files.length && folder._files.length > 0;
            const someInPlaylist = filesInPlaylist > 0 && !allInPlaylist;
            
            html += `
                <div class="tree-item tree-folder ${expandedClass}" data-folder-id="${folderId}" data-folder-path="${this._escapeHtml(folderPath)}">
                    <div class="tree-folder-header" data-folder-id="${folderId}">
                        <span class="tree-folder-icon">📁</span>
                        <span class="tree-folder-name">${this._escapeHtml(folder._name)}</span>
                        <span class="tree-folder-count">(${filesInPlaylist}/${folder._files.length})</span>
                        <div class="tree-actions">
                            <button class="btn-tree-action btn-add-folder ${allInPlaylist ? 'disabled' : ''}" 
                                    data-folder-path="${this._escapeHtml(folderPath)}" 
                                    title="Añadir carpeta a playlist">➕</button>
                            <button class="btn-tree-action btn-remove-folder ${filesInPlaylist === 0 ? 'disabled' : ''}" 
                                    data-folder-path="${this._escapeHtml(folderPath)}" 
                                    title="Quitar carpeta de playlist">➖</button>
                        </div>
                    </div>
                    <div class="tree-folder-content">
            `;
            
            // Renderizar subcarpetas primero
            if (Object.keys(folder._subfolders).length > 0) {
                html += this._renderFolder(folder._subfolders, level + 1);
            }
            
            // Renderizar archivos
            for (const file of folder._files) {
                const fileId = this._generateId(file.path);
                const isPlaying = this.selectedFile?.path === file.path;
                const isInPlaylist = this.checkInPlaylist && this.checkInPlaylist(file.path);
                const playingClass = isPlaying ? 'playing' : '';
                const inPlaylistClass = isInPlaylist ? 'in-playlist' : '';
                
                html += `
                    <div class="tree-item tree-file ${playingClass} ${inPlaylistClass}" 
                         data-file-path="${this._escapeHtml(file.path)}"
                         data-file-id="${fileId}">
                        <span class="tree-file-icon">${isInPlaylist ? '✅' : '🎵'}</span>
                        <span class="tree-file-name" title="${this._escapeHtml(file.name)}">
                            ${this._escapeHtml(file.displayName)}
                        </span>
                        <div class="tree-actions">
                            <button class="btn-tree-action btn-add-track ${isInPlaylist ? 'hidden' : ''}" 
                                    data-file-path="${this._escapeHtml(file.path)}" 
                                    title="Añadir a playlist">➕</button>
                            <button class="btn-tree-action btn-remove-track ${!isInPlaylist ? 'hidden' : ''}" 
                                    data-file-path="${this._escapeHtml(file.path)}" 
                                    title="Quitar de playlist">➖</button>
                        </div>
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        return html;
    }
    
    /**
     * Genera un ID único para un elemento
     * @param {string} str 
     */
    _generateId(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'id_' + Math.abs(hash).toString(36);
    }
    
    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text 
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Añade event listeners al árbol renderizado
     */
    _attachEventListeners() {
        // Click en carpetas para expandir/colapsar (solo en el nombre, no en botones)
        const folderHeaders = this.container.querySelectorAll('.tree-folder-header');
        folderHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                // Ignorar si se hizo click en un botón
                if (e.target.closest('.tree-actions')) return;
                
                const folderId = header.dataset.folderId;
                const folder = header.closest('.tree-folder');
                
                if (folder.classList.contains('collapsed')) {
                    folder.classList.remove('collapsed');
                    this.expandedFolders.add(folderId);
                } else {
                    folder.classList.add('collapsed');
                    this.expandedFolders.delete(folderId);
                }
            });
        });
        
        // Click en archivos para seleccionar
        const fileItems = this.container.querySelectorAll('.tree-file');
        fileItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Ignorar si se hizo click en un botón
                if (e.target.closest('.tree-actions')) return;
                
                const filePath = item.dataset.filePath;
                this.selectFile(filePath);
            });
            
            // Doble click para añadir a playlist y reproducir
            item.addEventListener('dblclick', (e) => {
                // Ignorar si se hizo click en un botón
                if (e.target.closest('.tree-actions')) return;
                
                const filePath = item.dataset.filePath;
                const file = this.files.find(f => f.path === filePath);
                if (file && this.onFileSelect) {
                    this.onFileSelect(file, true); // true = reproducir inmediatamente
                }
            });
        });
        
        // Botones de añadir track
        this.container.querySelectorAll('.btn-add-track').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filePath = btn.dataset.filePath;
                const file = this.files.find(f => f.path === filePath);
                if (file && this.onAddTrack) {
                    this.onAddTrack(file);
                }
            });
        });
        
        // Botones de quitar track
        this.container.querySelectorAll('.btn-remove-track').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filePath = btn.dataset.filePath;
                const file = this.files.find(f => f.path === filePath);
                if (file && this.onRemoveTrack) {
                    this.onRemoveTrack(file);
                }
            });
        });
        
        // Botones de añadir carpeta
        this.container.querySelectorAll('.btn-add-folder').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (btn.classList.contains('disabled')) return;
                const folderPath = btn.dataset.folderPath;
                const files = this.getFilesFromFolder(folderPath);
                if (files.length > 0 && this.onAddFolder) {
                    this.onAddFolder(folderPath, files);
                }
            });
        });
        
        // Botones de quitar carpeta
        this.container.querySelectorAll('.btn-remove-folder').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (btn.classList.contains('disabled')) return;
                const folderPath = btn.dataset.folderPath;
                const files = this.getFilesFromFolder(folderPath);
                if (files.length > 0 && this.onRemoveFolder) {
                    this.onRemoveFolder(folderPath, files);
                }
            });
        });
    }
    
    /**
     * Obtiene todos los archivos de una carpeta específica
     * @param {string} folderPath - Ruta de la carpeta
     * @returns {Array} Array de archivos
     */
    getFilesFromFolder(folderPath) {
        return this.files.filter(f => f.folder === folderPath);
    }
    
    /**
     * Selecciona un archivo
     * @param {string} filePath 
     */
    selectFile(filePath) {
        const file = this.files.find(f => f.path === filePath);
        if (!file) return;
        
        // Actualizar selección visual
        const prevSelected = this.container.querySelector('.tree-file.playing');
        if (prevSelected) {
            prevSelected.classList.remove('playing');
        }
        
        const newSelected = this.container.querySelector(`[data-file-path="${CSS.escape(filePath)}"]`);
        if (newSelected) {
            newSelected.classList.add('playing');
        }
        
        this.selectedFile = file;
        
        if (this.onFileSelect) {
            this.onFileSelect(file, false);
        }
    }
    
    /**
     * Marca un archivo como reproduciéndose
     * @param {string} filePath 
     */
    setPlayingFile(filePath) {
        // Quitar marca anterior
        const prevPlaying = this.container.querySelector('.tree-file.playing');
        if (prevPlaying) {
            prevPlaying.classList.remove('playing');
        }
        
        // Añadir nueva marca
        if (filePath) {
            const newPlaying = this.container.querySelector(`[data-file-path="${CSS.escape(filePath)}"]`);
            if (newPlaying) {
                newPlaying.classList.add('playing');
                // Expandir carpetas padre para mostrar el archivo
                this._expandParentFolders(newPlaying);
            }
        }
        
        this.selectedFile = filePath ? this.files.find(f => f.path === filePath) : null;
    }
    
    /**
     * Expande las carpetas padre de un elemento
     * @param {Element} element 
     */
    _expandParentFolders(element) {
        let parent = element.parentElement;
        while (parent && parent !== this.container) {
            if (parent.classList.contains('tree-folder')) {
                parent.classList.remove('collapsed');
                const folderId = parent.dataset.folderId;
                if (folderId) {
                    this.expandedFolders.add(folderId);
                }
            }
            parent = parent.parentElement;
        }
    }
    
    /**
     * Expande todas las carpetas
     */
    expandAll() {
        const folders = this.container.querySelectorAll('.tree-folder');
        folders.forEach(folder => {
            folder.classList.remove('collapsed');
            const folderId = folder.dataset.folderId;
            if (folderId) {
                this.expandedFolders.add(folderId);
            }
        });
    }
    
    /**
     * Colapsa todas las carpetas
     */
    collapseAll() {
        const folders = this.container.querySelectorAll('.tree-folder');
        folders.forEach(folder => {
            folder.classList.add('collapsed');
        });
        this.expandedFolders.clear();
    }
    
    /**
     * Obtiene todos los archivos cargados
     */
    getFiles() {
        return this.files;
    }
    
    /**
     * Obtiene el número de archivos
     */
    getFileCount() {
        return this.files.length;
    }
    
    /**
     * Añade archivos desde la configuración (config.js / servidor)
     * Construye la estructura de carpetas igual que cuando se cargan desde navegador
     * @param {Array} files - Array de objetos de archivo
     * @param {string} folderName - Nombre de la carpeta raíz (opcional)
     */
    addFilesFromConfig(files, folderName) {
        console.log(`📂 Añadiendo ${files.length} archivos desde servidor...`);
        
        // Añadir archivos al array principal
        for (const file of files) {
            // Evitar duplicados
            if (!this.files.some(f => f.path === file.path)) {
                this.files.push(file);
                
                // Construir estructura de carpetas usando el path completo
                const pathParts = file.path.split('/');
                this._addToFolderStructure(pathParts, file);
                
                console.log(`  ✓ ${file.name} (${file.folder})`);
            }
        }
        
        // Ordenar la estructura
        this._sortFolderStructure(this.folderStructure);
        
        // Re-renderizar
        this.render();
        
        // Callback
        if (this.onFilesLoaded) {
            this.onFilesLoaded(files);
        }
    }
    
    /**
     * Limpia todos los archivos y la estructura
     */
    clear() {
        this.files = [];
        this.folderStructure = {};
        this.selectedFile = null;
        this.expandedFolders.clear();
        this.render();
    }
}

// Exportar para uso en otros módulos
window.FileExplorer = FileExplorer;
