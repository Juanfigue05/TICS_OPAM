// ============================================================================
// ARCHIVO: 2_frontend/assets/js/api.js
// DESCRIPCIÓN: Cliente HTTP hacia la API REST del backend.
// FIX: baseURL dinámica | métodos accesorios agregados
// ============================================================================

const API = {
    // FIX: baseURL dinámica — funciona en cualquier puerto/host
    get baseURL() {
        return `${window.location.origin}/api`;
    },

    token: localStorage.getItem('token'),

    setToken(t)   { this.token = t; localStorage.setItem('token', t); },
    clearToken()  { this.token = null; localStorage.removeItem('token'); localStorage.removeItem('usuario'); },

    headers() {
        const h = { 'Content-Type': 'application/json' };
        if (this.token) h['Authorization'] = `Bearer ${this.token}`;
        return h;
    },

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: this.headers()
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.clearToken();
                    window.location.href = '/index.html';
                }
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // ── Auth ──────────────────────────────────────────────────────────────────
    async login(u, p) {
        const d = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: u, password: p })
        });
        if (d.success) {
            this.setToken(d.token);
            localStorage.setItem('usuario', JSON.stringify(d.usuario));
        }
        return d;
    },
    async logout() { this.clearToken(); window.location.href = '/index.html'; },
    async getMe()  { return this.request('/auth/me'); },

    // ── Personas ──────────────────────────────────────────────────────────────
    async getPersonas(p = {})      { const q = new URLSearchParams(p).toString(); return this.request(`/personas${q ? '?' + q : ''}`); },
    async getPersona(id)           { return this.request(`/personas/${id}`); },
    async createPersona(d)         { return this.request('/personas', { method: 'POST', body: JSON.stringify(d) }); },
    async updatePersona(id, d)     { return this.request(`/personas/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
    async deletePersona(id)        { return this.request(`/personas/${id}`, { method: 'DELETE' }); },

    // ── Computadores ──────────────────────────────────────────────────────────
    async getComputadores(p = {})  { const q = new URLSearchParams(p).toString(); return this.request(`/computadores${q ? '?' + q : ''}`); },
    async getComputador(id)        { return this.request(`/computadores/${id}`); },
    async createComputador(d)      { return this.request('/computadores', { method: 'POST', body: JSON.stringify(d) }); },
    async updateComputador(id, d)  { return this.request(`/computadores/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
    async deleteComputador(id)     { return this.request(`/computadores/${id}`, { method: 'DELETE' }); },

    // ── Celulares ─────────────────────────────────────────────────────────────
    async getCelulares(p = {})     { const q = new URLSearchParams(p).toString(); return this.request(`/celulares${q ? '?' + q : ''}`); },
    async getCelular(id)           { return this.request(`/celulares/${id}`); },
    async createCelular(d)         { return this.request('/celulares', { method: 'POST', body: JSON.stringify(d) }); },
    async updateCelular(id, d)     { return this.request(`/celulares/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
    async deleteCelular(id)        { return this.request(`/celulares/${id}`, { method: 'DELETE' }); },

    // ── Impresoras ────────────────────────────────────────────────────────────
    async getImpresoras(p = {})    { const q = new URLSearchParams(p).toString(); return this.request(`/impresoras${q ? '?' + q : ''}`); },
    async getImpresora(id)         { return this.request(`/impresoras/${id}`); },
    async createImpresora(d)       { return this.request('/impresoras', { method: 'POST', body: JSON.stringify(d) }); },
    async updateImpresora(id, d)   { return this.request(`/impresoras/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
    async deleteImpresora(id)      { return this.request(`/impresoras/${id}`, { method: 'DELETE' }); },

    // ── Radios ────────────────────────────────────────────────────────────────
    async getRadios(p = {})        { const q = new URLSearchParams(p).toString(); return this.request(`/radios${q ? '?' + q : ''}`); },
    async getRadio(id)             { return this.request(`/radios/${id}`); },
    async createRadio(d)           { return this.request('/radios', { method: 'POST', body: JSON.stringify(d) }); },
    async updateRadio(id, d)       { return this.request(`/radios/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
    async deleteRadio(id)          { return this.request(`/radios/${id}`, { method: 'DELETE' }); },

    // ── Teléfonos IP ──────────────────────────────────────────────────────────
    async getTelefonosIP(p = {})   { const q = new URLSearchParams(p).toString(); return this.request(`/telefonos-ip${q ? '?' + q : ''}`); },
    async getTelefonoIP(id)        { return this.request(`/telefonos-ip/${id}`); },
    async createTelefonoIP(d)      { return this.request('/telefonos-ip', { method: 'POST', body: JSON.stringify(d) }); },
    async updateTelefonoIP(id, d)  { return this.request(`/telefonos-ip/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
    async deleteTelefonoIP(id)     { return this.request(`/telefonos-ip/${id}`, { method: 'DELETE' }); },

    // ── Tablets ───────────────────────────────────────────────────────────────
    async getTablets(p = {})       { const q = new URLSearchParams(p).toString(); return this.request(`/tablets${q ? '?' + q : ''}`); },
    async getTablet(id)            { return this.request(`/tablets/${id}`); },
    async createTablet(d)          { return this.request('/tablets', { method: 'POST', body: JSON.stringify(d) }); },
    async updateTablet(id, d)      { return this.request(`/tablets/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
    async deleteTablet(id)         { return this.request(`/tablets/${id}`, { method: 'DELETE' }); },

    // ── Accesorios ────────────────────────────────────────────────────────────
    async getAccesorios(p = {})    { const q = new URLSearchParams(p).toString(); return this.request(`/accesorios${q ? '?' + q : ''}`); },
    async getAccesorio(id)         { return this.request(`/accesorios/${id}`); },
    async createAccesorio(d)       { return this.request('/accesorios', { method: 'POST', body: JSON.stringify(d) }); },
    async updateAccesorio(id, d)   { return this.request(`/accesorios/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
    async deleteAccesorio(id)      { return this.request(`/accesorios/${id}`, { method: 'DELETE' }); },

    // ── Ubicaciones ───────────────────────────────────────────────────────────
    async getUbicaciones(p = {})   { const q = new URLSearchParams(p).toString(); return this.request(`/ubicaciones${q ? '?' + q : ''}`); },
    async getUbicacion(id)         { return this.request(`/ubicaciones/${id}`); },
    async createUbicacion(d)       { return this.request('/ubicaciones', { method: 'POST', body: JSON.stringify(d) }); },
    async updateUbicacion(id, d)   { return this.request(`/ubicaciones/${id}`, { method: 'PUT', body: JSON.stringify(d) }); },
    async deleteUbicacion(id)      { return this.request(`/ubicaciones/${id}`, { method: 'DELETE' }); },

    // ── Stats globales ────────────────────────────────────────────────────────
    async getStats() { return this.request('/stats'); }
};

// Verificar autenticación al cargar cualquier página protegida
function verificarAuth() {
    const isPublic = window.location.pathname === '/'
        || window.location.pathname.endsWith('index.html')
        || window.location.pathname.endsWith('login.html');
    if (!API.token && !isPublic) {
        window.location.href = '/index.html';
    }
}

if (typeof window !== 'undefined') verificarAuth();