/**
 * Tutorial - Recorrido guiado para usuarios nuevos
 * Resalta elementos de la interfaz con un foco (spotlight) y una ventana
 * flotante explicativa. Se lanza automáticamente la primera vez y puede
 * reabrirse en cualquier momento desde el botón de tutorial del header.
 *
 * Cada paso: { icon, title, text, target?, placement? }
 *   - target:    selector CSS del elemento a resaltar. Si falta o no es
 *                visible, el paso se muestra centrado y atenúa toda la pantalla.
 *   - placement: 'below' | 'above' | 'right' | 'left' | 'auto' (por defecto)
 */
class Tutorial {
    static SEEN_KEY = 'bardicTunes_tutorialSeen';

    static hasSeen() {
        return localStorage.getItem(Tutorial.SEEN_KEY) === 'true';
    }

    static markSeen() {
        localStorage.setItem(Tutorial.SEEN_KEY, 'true');
    }

    constructor(steps) {
        this.steps  = steps || [];
        this.index  = 0;
        this.active = false;
        this.onEnd  = null;
        this._els   = {};
        this._onReposition = this._reposition.bind(this);
        this._onKeydown    = this._handleKeydown.bind(this);
    }

    // ============================================
    // CONSTRUCCIÓN DEL DOM (perezosa, una sola vez)
    // ============================================

    _build() {
        if (this._els.overlay) return;

        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.id        = 'tutorial-overlay';

        const spotlight = document.createElement('div');
        spotlight.className = 'tutorial-spotlight';

        const popover = document.createElement('div');
        popover.className = 'tutorial-popover';
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-modal', 'true');

        overlay.appendChild(spotlight);
        document.body.appendChild(overlay);
        document.body.appendChild(popover);

        this._els = { overlay, spotlight, popover };
    }

    // ============================================
    // CONTROL DEL RECORRIDO
    // ============================================

    start(fromBeginning = true) {
        if (this.steps.length === 0) return;
        this._build();
        if (fromBeginning) this.index = 0;
        this.active = true;
        this._els.overlay.classList.add('visible');
        this._els.popover.classList.add('visible');
        document.body.classList.add('tutorial-active');
        window.addEventListener('resize', this._onReposition);
        window.addEventListener('scroll', this._onReposition, true);
        document.addEventListener('keydown', this._onKeydown, true);
        this._render();
    }

    end() {
        this.active = false;
        if (this._els.overlay) this._els.overlay.classList.remove('visible');
        if (this._els.popover) this._els.popover.classList.remove('visible');
        document.body.classList.remove('tutorial-active');
        window.removeEventListener('resize', this._onReposition);
        window.removeEventListener('scroll', this._onReposition, true);
        document.removeEventListener('keydown', this._onKeydown, true);
        Tutorial.markSeen();
        if (typeof this.onEnd === 'function') this.onEnd();
    }

    next() {
        if (this.index < this.steps.length - 1) { this.index++; this._render(); }
        else this.end();
    }

    prev() {
        if (this.index > 0) { this.index--; this._render(); }
    }

    goTo(i) {
        if (i >= 0 && i < this.steps.length) { this.index = i; this._render(); }
    }

    _handleKeydown(e) {
        if (!this.active) return;
        switch (e.key) {
            case 'Escape':     e.preventDefault(); e.stopPropagation(); this.end(); break;
            case 'ArrowRight': e.preventDefault(); e.stopPropagation(); this.next(); break;
            case 'ArrowLeft':  e.preventDefault(); e.stopPropagation(); this.prev(); break;
            case ' ':          e.preventDefault(); e.stopPropagation(); this.next(); break;
        }
    }

    // ============================================
    // RENDER
    // ============================================

    _render() {
        const step    = this.steps[this.index];
        const popover = this._els.popover;
        const isLast  = this.index === this.steps.length - 1;
        const isFirst = this.index === 0;

        const dots = this.steps.map((_, i) =>
            '<span class="tutorial-dot' + (i === this.index ? ' active' : '') + '"></span>'
        ).join('');

        popover.innerHTML =
            '<button class="tutorial-close" data-act="skip" title="Cerrar tutorial">✕</button>' +
            (step.icon ? '<div class="tutorial-icon">' + step.icon + '</div>' : '') +
            '<h3 class="tutorial-title">' + step.title + '</h3>' +
            '<p class="tutorial-text">' + step.text + '</p>' +
            '<div class="tutorial-dots">' + dots + '</div>' +
            '<div class="tutorial-actions">' +
                '<button class="tutorial-skip" data-act="skip">' +
                    (isLast ? '' : 'Saltar tutorial') +
                '</button>' +
                '<div class="tutorial-nav">' +
                    '<span class="tutorial-step-count">' + (this.index + 1) + ' / ' + this.steps.length + '</span>' +
                    (isFirst ? '' : '<button class="tutorial-btn tutorial-btn-ghost" data-act="prev">Anterior</button>') +
                    '<button class="tutorial-btn tutorial-btn-primary" data-act="next">' +
                        (isLast ? '¡Empezar! 🎲' : 'Siguiente') +
                    '</button>' +
                '</div>' +
            '</div>';

        popover.querySelectorAll('[data-act]').forEach(btn => {
            btn.addEventListener('click', () => {
                const act = btn.dataset.act;
                if (act === 'skip')      this.end();
                else if (act === 'prev') this.prev();
                else if (act === 'next') this.next();
            });
        });

        // Reposicionar tras pintar para conocer el tamaño real del popover
        requestAnimationFrame(this._onReposition);
    }

    // ============================================
    // POSICIONAMIENTO DEL FOCO Y LA VENTANA
    // ============================================

    _reposition() {
        if (!this.active) return;

        const step      = this.steps[this.index];
        const overlay   = this._els.overlay;
        const spotlight = this._els.spotlight;
        const popover   = this._els.popover;

        const target  = step.target ? document.querySelector(step.target) : null;
        const visible = target &&
            target.offsetParent !== null &&
            target.getClientRects().length > 0;

        // Paso centrado: sin foco, se atenúa toda la pantalla
        if (!visible) {
            overlay.classList.add('dim');
            spotlight.classList.add('hidden-spot');
            popover.classList.add('centered');
            popover.style.left = '50%';
            popover.style.top  = '50%';
            return;
        }

        overlay.classList.remove('dim');
        spotlight.classList.remove('hidden-spot');
        popover.classList.remove('centered');

        // El elemento debe quedar a la vista antes de medir
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });

        const pad = 8;
        const r   = target.getBoundingClientRect();
        spotlight.style.left   = (r.left - pad) + 'px';
        spotlight.style.top    = (r.top  - pad) + 'px';
        spotlight.style.width  = (r.width  + pad * 2) + 'px';
        spotlight.style.height = (r.height + pad * 2) + 'px';

        // Elegir el lado con espacio suficiente para la ventana
        const pr   = popover.getBoundingClientRect();
        const popW = pr.width, popH = pr.height;
        const gap  = 16;
        const vw   = window.innerWidth, vh = window.innerHeight;

        const spaceBelow = vh - r.bottom;
        const spaceAbove = r.top;
        const spaceRight = vw - r.right;
        const spaceLeft  = r.left;

        let placement = step.placement || 'auto';
        if (placement === 'auto') {
            if      (spaceBelow >= popH + gap) placement = 'below';
            else if (spaceAbove >= popH + gap) placement = 'above';
            else if (spaceRight >= popW + gap) placement = 'right';
            else if (spaceLeft  >= popW + gap) placement = 'left';
            else                               placement = 'below';
        }

        let top, left;
        switch (placement) {
            case 'above':
                top  = r.top - gap - popH;
                left = r.left + r.width / 2 - popW / 2;
                break;
            case 'right':
                left = r.right + gap;
                top  = r.top + r.height / 2 - popH / 2;
                break;
            case 'left':
                left = r.left - gap - popW;
                top  = r.top + r.height / 2 - popH / 2;
                break;
            case 'below':
            default:
                top  = r.bottom + gap;
                left = r.left + r.width / 2 - popW / 2;
                break;
        }

        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        left = clamp(left, gap, vw - popW - gap);
        top  = clamp(top,  gap, vh - popH - gap);

        popover.style.left = left + 'px';
        popover.style.top  = top + 'px';
    }
}

window.Tutorial = Tutorial;
