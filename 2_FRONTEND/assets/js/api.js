const API = {
    baseURL: `${window.location.origin}/api`,

    get token() { return localStorage.getItem('token'); },
    setToken(t) { localStorage.setItem('token', t); },
    clearToken() { localStorage.removeItem('token'); localStorage.removeItem('usuario'); },

    headers() {
        const h = { 'Content-Type': 'application/json' };
        if (this.token) h.Authorization = `Bearer ${this.token}`;
        return h;
    },

    async request(endpoint, options = {}) {
        const res = await fetch(this.baseURL + endpoint, {
            ...options,
            headers: this.headers()
        });
        const data = await res.json();
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                this.clearToken();
                window.location.href = '../../index.html';
            }
            throw new Error(data.error || `Error ${res.status}`);
        }
        return data;
    },

    // Auth
    login(u, p) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify({username:u, password:p}) }); },
    getMe()     { return this.request('/auth/me'); },
    logout() { this.clearToken(); window.location.href = '/index.html'; },

    // Todos los endpoints (coinciden con tu backend 3.1)
    getComputadores(q)  { return this.request('/computadores' + (q ? '?' + new URLSearchParams(q) : '')); },
    getCelulares(q)     { return this.request('/celulares' + (q ? '?' + new URLSearchParams(q) : '')); },
    getImpresoras(q)    { return this.request('/impresoras' + (q ? '?' + new URLSearchParams(q) : '')); },
    getRadios(q)        { return this.request('/radios' + (q ? '?' + new URLSearchParams(q) : '')); },
    getTelefonosIP(q)   { return this.request('/telefonos-ip' + (q ? '?' + new URLSearchParams(q) : '')); },
    getTablets(q)       { return this.request('/tablets' + (q ? '?' + new URLSearchParams(q) : '')); },
    getAccesorios(q)    { return this.request('/accesorios' + (q ? '?' + new URLSearchParams(q) : '')); },
    getPersonas(q)      { return this.request('/personas' + (q ? '?' + new URLSearchParams(q) : '')); },
    getUbicaciones(q)   { return this.request('/ubicaciones' + (q ? '?' + new URLSearchParams(q) : '')); },

    // CRUD genérico (ejemplo)
    create(endpoint, data) { return this.request(endpoint, {method:'POST', body:JSON.stringify(data)}); },
    update(endpoint, data) { return this.request(endpoint, {method:'PUT', body:JSON.stringify(data)}); },
    delete(endpoint)       { return this.request(endpoint, {method:'DELETE'}); }
};