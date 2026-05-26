/**
 * UserManager - Gestión de usuarios y autenticación
 * Comunicación con la API REST del servidor (bcrypt + JWT)
 */
class UserManager {
    constructor() {
        this._token    = localStorage.getItem('bardic-token')    || null;
        this._username = localStorage.getItem('bardic-username') || null;
    }

    // ¿Hay un token guardado?
    isLoggedIn() {
        return !!this._token;
    }

    getToken() {
        return this._token;
    }

    getUsername() {
        return this._username || '';
    }

    /**
     * Registrar un nuevo usuario.
     * Lanza un Error con el mensaje del servidor si falla.
     */
    async register(username, password) {
        const res  = await fetch('/api/auth/register', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al registrarse');
        this._saveSession(data.token, data.username);
    }

    /**
     * Iniciar sesión con usuario y contraseña.
     * Lanza un Error con el mensaje del servidor si falla.
     */
    async login(username, password) {
        const res  = await fetch('/api/auth/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
        this._saveSession(data.token, data.username);
    }

    /** Cerrar sesión: borra el token y recarga la página */
    logout() {
        this._token    = null;
        this._username = null;
        localStorage.removeItem('bardic-token');
        localStorage.removeItem('bardic-username');
        window.location.reload();
    }

    _saveSession(token, username) {
        this._token    = token;
        this._username = username;
        localStorage.setItem('bardic-token',    token);
        localStorage.setItem('bardic-username', username);
    }
}
