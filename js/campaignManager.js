/**
 * CampaignManager - Gestión de partidas de rol
 * Maneja múltiples partidas, cada una con su propia biblioteca de canciones y descripciones
 */
class CampaignManager {
    constructor() {
        this.campaigns        = [];
        this.activeCampaignId = null;
        this.token            = null;
        // load() se llama explícitamente desde app.js tras el login
    }

    setToken(token) {
        this.token = token;
    }

    // ============================================
    // PERSISTENCIA
    // ============================================

    async load() {
        try {
            const res = await fetch('/api/campaigns', {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            if (!res.ok) throw new Error('No autenticado (' + res.status + ')');
            const data = await res.json();
            this.campaigns        = data.campaigns || [];
            this.activeCampaignId = data.activeCampaignId || null;
            // Validar que la campaña activa existe
            if (this.activeCampaignId && !this.getCampaignById(this.activeCampaignId)) {
                this.activeCampaignId = this.campaigns.length > 0 ? this.campaigns[0].id : null;
            }
        } catch (e) {
            console.error('Error cargando partidas:', e);
            throw e; // relanzar para que app.js detecte fallos de auth
        }
    }

    save() {
        // Fire-and-forget: guarda en segundo plano sin bloquear la UI
        fetch('/api/campaigns', {
            method:  'PUT',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': 'Bearer ' + this.token
            },
            body: JSON.stringify({
                campaigns:        this.campaigns,
                activeCampaignId: this.activeCampaignId
            })
        }).catch(e => console.error('Error guardando partidas:', e));
    }

    // ============================================
    // CRUD DE PARTIDAS
    // ============================================

    createCampaign(name) {
        const campaign = {
            id: this._generateId(),
            name: name.trim() || 'Nueva Partida',
            createdAt: Date.now(),
            tracks: [],
            tags: []
        };
        this.campaigns.push(campaign);
        this.save();
        return campaign;
    }

    renameCampaign(id, name) {
        const campaign = this.getCampaignById(id);
        if (!campaign) return;
        const trimmed = name.trim();
        if (trimmed) {
            campaign.name = trimmed;
            this.save();
        }
    }

    deleteCampaign(id) {
        const index = this.campaigns.findIndex(c => c.id === id);
        if (index === -1) return;
        this.campaigns.splice(index, 1);
        if (this.activeCampaignId === id) {
            this.activeCampaignId = this.campaigns.length > 0 ? this.campaigns[0].id : null;
        }
        this.save();
    }

    setActiveCampaign(id) {
        if (!this.getCampaignById(id)) return;
        this.activeCampaignId = id;
        this.save();
    }

    getActiveCampaign() {
        if (!this.activeCampaignId) return null;
        return this.getCampaignById(this.activeCampaignId);
    }

    getCampaignById(id) {
        return this.campaigns.find(c => c.id === id) || null;
    }

    getCampaigns() {
        return this.campaigns;
    }

    // ============================================
    // GESTIÓN DE TRACKS
    // ============================================

    /**
     * Añade tracks a una partida.
     * Solo guarda los metadatos serializables (NO el objeto File del navegador).
     * @param {string} campaignId
     * @param {Array} tracks - Array de objetos track del FileExplorer
     */
    addTracks(campaignId, tracks) {
        const campaign = this.getCampaignById(campaignId);
        if (!campaign) return;

        let added = 0;
        for (const track of tracks) {
            if (!this.hasTrack(campaignId, track.path)) {
                campaign.tracks.push({
                    path: track.path,
                    name: track.name,
                    displayName: track.displayName || track.name,
                    folder: track.folder || '',
                    description: '',
                    src: track.src || null,         // URL para tracks del servidor
                    extension: track.extension || '',
                    tags: []
                    // Nota: el objeto File NO se serializa (solo vive en FileExplorer)
                });
                added++;
            }
        }

        if (added > 0) this.save();
        return added;
    }

    removeTrack(campaignId, path) {
        const campaign = this.getCampaignById(campaignId);
        if (!campaign) return;
        const index = campaign.tracks.findIndex(t => t.path === path);
        if (index !== -1) {
            campaign.tracks.splice(index, 1);
            this.save();
        }
    }

    updateTrackDescription(campaignId, path, description) {
        const campaign = this.getCampaignById(campaignId);
        if (!campaign) return;
        const track = campaign.tracks.find(t => t.path === path);
        if (track) {
            track.description = description;
            this.save();
        }
    }

    hasTrack(campaignId, path) {
        const campaign = this.getCampaignById(campaignId);
        if (!campaign) return false;
        return campaign.tracks.some(t => t.path === path);
    }

    // ============================================
    // TAGS
    // ============================================

    _nextTagColor(campaign) {
        const COLORS = ['#9b4444','#4a6fa5','#4a7c59','#7b5c9a','#8b6914','#3a7a8a','#8a5a3a','#3a4a8a'];
        return COLORS[(campaign.tags || []).length % COLORS.length];
    }

    createTag(campaignId, name) {
        const campaign = this.getCampaignById(campaignId);
        if (!campaign) return null;
        if (!campaign.tags) campaign.tags = [];
        const trimmed = name.trim();
        if (!trimmed) return null;
        if (campaign.tags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) return null;
        const tag = { id: this._generateId(), name: trimmed, color: this._nextTagColor(campaign) };
        campaign.tags.push(tag);
        this.save();
        return tag;
    }

    deleteTag(campaignId, tagId) {
        const campaign = this.getCampaignById(campaignId);
        if (!campaign) return;
        campaign.tags = (campaign.tags || []).filter(t => t.id !== tagId);
        campaign.tracks.forEach(track => {
            if (track.tags) track.tags = track.tags.filter(id => id !== tagId);
        });
        this.save();
    }

    toggleTagOnTrack(campaignId, trackPath, tagId) {
        const campaign = this.getCampaignById(campaignId);
        if (!campaign) return;
        const track = campaign.tracks.find(t => t.path === trackPath);
        if (!track) return;
        if (!track.tags) track.tags = [];
        const idx = track.tags.indexOf(tagId);
        if (idx !== -1) track.tags.splice(idx, 1);
        else track.tags.push(tagId);
        this.save();
    }

    addTagToTrack(campaignId, trackPath, tagId) {
        const campaign = this.getCampaignById(campaignId);
        if (!campaign) return;
        const track = campaign.tracks.find(t => t.path === trackPath);
        if (!track) return;
        if (!track.tags) track.tags = [];
        if (!track.tags.includes(tagId)) { track.tags.push(tagId); this.save(); }
    }

    // ============================================
    // UTILS
    // ============================================

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
}

window.CampaignManager = CampaignManager;
