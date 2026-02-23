// ============================================================================
// components.js — TICS Aeropuerto v3.1
// CORRECCIONES:
//   1. loadUserInfo() usa localStorage como fuente primaria (instantáneo)
//      y /auth/me como verificación secundaria.
//      Elimina el bug de rol_db (campo que no existe en la respuesta).
//   2. loadComponents() re-ejecuta los <script> inyectados vía innerHTML
//      (los navegadores no los ejecutan automáticamente).
//   3. Toast system actualizado con nuevas clases del CSS.
// ============================================================================

// ─── MODAL DE CONFIRMACIÓN ───────────────────────────────────────────────────
//
// Reemplaza el nativo confirm() con un modal temático.
// Uso: const ok = await confirmAction({ title, message, confirmText, type })
// type: 'danger' | 'warning' | 'info'  (default: 'danger')
// ─────────────────────────────────────────────────────────────────────────────

function confirmAction({ title = '¿Confirmar acción?', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'danger' } = {}) {
    return new Promise(resolve => {
        const prev = document.getElementById('_confirmModal');
        if (prev) prev.remove();

        const ICONS = {
            danger:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
            warning: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
            info:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12.01" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`,
        };
        const COLORS = {
            danger:  { icon: '#ef4444', btn: '#ef4444', btnHover: '#dc2626' },
            warning: { icon: '#f59e0b', btn: '#f59e0b', btnHover: '#d97706' },
            info:    { icon: '#3b82f6', btn: '#3b82f6', btnHover: '#2563eb' },
        };
        const c = COLORS[type] || COLORS.danger;

        const overlay = document.createElement('div');
        overlay.id = '_confirmModal';
        overlay.style.cssText = `
            position:fixed;inset:0;z-index:9999;
            display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,.55);backdrop-filter:blur(3px);
            animation:_cfIn .15s ease;
        `;

        overlay.innerHTML = `
            <style>
                @keyframes _cfIn   { from{opacity:0}to{opacity:1} }
                @keyframes _cfSlide{ from{transform:translateY(-12px) scale(.97);opacity:0}
                                      to {transform:translateY(0) scale(1);opacity:1} }
                #_confirmModal .cf-box {
                    background:var(--clr-surface,#1a1f2e);
                    border:1px solid var(--clr-border,rgba(255,255,255,.1));
                    border-radius:14px;padding:2rem 1.75rem 1.5rem;
                    max-width:400px;width:calc(100vw - 2.5rem);
                    box-shadow:0 25px 60px rgba(0,0,0,.5);
                    animation:_cfSlide .2s cubic-bezier(.34,1.56,.64,1);text-align:center;
                }
                #_confirmModal .cf-icon {
                    width:52px;height:52px;border-radius:50%;
                    background:${c.icon}22;display:flex;align-items:center;
                    justify-content:center;margin:0 auto 1rem;color:${c.icon};
                }
                #_confirmModal .cf-title {
                    font-size:1rem;font-weight:700;color:var(--clr-text,#e2e8f0);
                    margin-bottom:.45rem;font-family:var(--font-display,'Inter',sans-serif);
                }
                #_confirmModal .cf-msg {
                    font-size:.85rem;color:var(--clr-text-muted,#94a3b8);
                    line-height:1.55;margin-bottom:1.5rem;
                }
                #_confirmModal .cf-actions { display:flex;gap:.65rem;justify-content:center; }
                #_confirmModal .cf-btn {
                    flex:1;padding:.6rem 1rem;border-radius:8px;border:none;
                    font-size:.84rem;font-weight:600;cursor:pointer;
                    transition:background .15s,transform .1s;font-family:inherit;
                }
                #_confirmModal .cf-btn:active { transform:scale(.97); }
                #_confirmModal .cf-cancel {
                    background:var(--clr-surface-2,#252b3b);
                    color:var(--clr-text-muted,#94a3b8);
                    border:1px solid var(--clr-border,rgba(255,255,255,.1));
                }
                #_confirmModal .cf-cancel:hover { background:var(--clr-surface-3,#2f3650); }
                #_confirmModal .cf-confirm { background:${c.btn};color:#fff; }
                #_confirmModal .cf-confirm:hover { background:${c.btnHover}; }
            </style>
            <div class="cf-box">
                <div class="cf-icon">${ICONS[type] || ICONS.danger}</div>
                <div class="cf-title">${title}</div>
                ${message ? `<div class="cf-msg">${message}</div>` : ''}
                <div class="cf-actions">
                    <button class="cf-btn cf-cancel" id="_cfCancel">${cancelText}</button>
                    <button class="cf-btn cf-confirm" id="_cfConfirm">${confirmText}</button>
                </div>
            </div>`;

        document.body.appendChild(overlay);
        const close = (result) => { overlay.remove(); resolve(result); };
        document.getElementById('_cfConfirm').addEventListener('click', () => close(true));
        document.getElementById('_cfCancel').addEventListener('click',  () => close(false));
        overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
        const onKey = e => {
            if (e.key === 'Enter')  { close(true);  document.removeEventListener('keydown', onKey); }
            if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', onKey); }
        };
        document.addEventListener('keydown', onKey);
        setTimeout(() => document.getElementById('_cfConfirm')?.focus(), 50);
    });
}

// ─── TOASTS ──────────────────────────────────────────────────────────────────

function showSuccess(msg) { _showToast(msg, 'toast-success', '✔'); }
function showError(msg)   { _showToast(msg, 'toast-error',   '✖'); }
function showWarning(msg) { _showToast(msg, 'toast-warning',  '⚠'); }

function _showToast(msg, type, icon) {
    // Crear contenedor si no existe
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-msg">${msg}</span>
        <span class="toast-close" onclick="this.closest('.toast').remove()">×</span>
    `;
    container.appendChild(toast);

    // Auto-eliminar en 4.5s con fade
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// ─── UTILIDADES ──────────────────────────────────────────────────────────────

function formatDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d) ? '—' : d.toLocaleDateString('es-CO');
}

function formatDateTime(date) {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d) ? '—' : d.toLocaleString('es-CO');
}

// ─── AUTENTICACIÓN ───────────────────────────────────────────────────────────

window.logout = async function () {
    const ok = await confirmAction({
        title: 'Cerrar sesión',
        message: '¿Estás seguro que deseas cerrar tu sesión actual?',
        confirmText: 'Cerrar sesión',
        cancelText: 'Cancelar',
        type: 'warning'
    });
    if (ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/index.html';
    }
};

// ─── CARGA DE INFO DE USUARIO ────────────────────────────────────────────────
//
// ESTRATEGIA DE 3 NIVELES:
//   1. localStorage.usuario  → Datos del login, disponibles AL INSTANTE
//      sin petición de red. Formato guardado por index.html después del login.
//   2. /auth/me              → Verifica y actualiza con datos frescos de la BD.
//   3. Decodificar JWT       → Fallback si falla la red pero existe el token.
//
// RESPUESTA REAL de /auth/me (auth.js):
//   { success: true, data: {
//       id_usuario, username, rol (=DB: ADMINISTRADOR/TICS/VISITANTE),
//       rol_jwt (=JWT: admin/technician/viewer),
//       id_persona, nombre, correo_asignado, cargo, area, celular,
//       ultimo_acceso
//   }}
//
// ─────────────────────────────────────────────────────────────────────────────

const ROL_LABELS = {
    admin:         'Administrador',
    ADMINISTRADOR: 'Administrador',
    technician:    'Técnico TICS',
    TICS:          'Técnico TICS',
    viewer:        'Visitante',
    VISITANTE:     'Visitante'
};

function _applyUserToNavbar(nombre, rolLabel) {
    const nameEl   = document.getElementById('navUserName');
    const roleEl   = document.getElementById('navUserRole');
    const avatarEl = document.getElementById('navAvatar');

    if (nameEl)   nameEl.textContent  = nombre   || '—';
    if (roleEl)   roleEl.textContent  = rolLabel  || '';
    if (avatarEl) avatarEl.textContent = (nombre || '?')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function _decodeJWT(token) {
    // Decodifica el payload del JWT sin verificar firma (solo para UI)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload; // { id_usuario, username, rol, rol_db, id_persona }
    } catch (e) {
        return null;
    }
}

async function loadUserInfo() {
    const token = localStorage.getItem('token');

    // ── Nivel 1: localStorage.usuario (instantáneo) ──
    const stored = localStorage.getItem('usuario');
    if (stored) {
        try {
            const u = JSON.parse(stored);
            // El login guarda: { nombre, username, rol, rol_db, cargo, area, ... }
            const nombre   = u.nombre || u.username || '—';
            const rolLabel = ROL_LABELS[u.rol] || ROL_LABELS[u.rol_db] || u.rol_db || u.rol || '';
            _applyUserToNavbar(nombre, rolLabel);
        } catch (e) { /* JSON inválido */ }
    }

    // ── Nivel 2: /auth/me (verifica token y trae datos actualizados) ──
    if (!token) return;

    try {
        const res = await API.getMe();
        // res.data.rol = DB role (ADMINISTRADOR | TICS | VISITANTE)
        // res.data.rol_jwt = JWT role (admin | technician | viewer)
        if (res && res.success && res.data) {
            const d        = res.data;
            const nombre   = d.nombre || d.username || '—';
            const rolLabel = ROL_LABELS[d.rol_jwt] || ROL_LABELS[d.rol] || d.rol || '';
            _applyUserToNavbar(nombre, rolLabel);
            // Actualizar localStorage con datos frescos de la BD
            const prev = JSON.parse(localStorage.getItem('usuario') || '{}');
            localStorage.setItem('usuario', JSON.stringify({ ...prev, ...d }));
        }
    } catch (err) {
        // ── Nivel 3: Decodificar JWT como último recurso ──
        if (token) {
            const payload = _decodeJWT(token);
            if (payload) {
                const nombre   = payload.username || '—';
                const rolLabel = ROL_LABELS[payload.rol] || '';
                _applyUserToNavbar(nombre, rolLabel);
            }
        }
        // No redirigir aquí: puede ser error de red temporal
        console.warn('[TICS] loadUserInfo - error al verificar sesión:', err.message);
    }
}

// ─── CARGADOR DE COMPONENTES HTML ────────────────────────────────────────────
//
// FIX CRÍTICO: Los navegadores NO ejecutan <script> insertados vía innerHTML.
// La función _executeScripts() clona cada <script> y lo reemplaza en el DOM,
// lo que fuerza al navegador a ejecutarlo.
// ─────────────────────────────────────────────────────────────────────────────

function _executeScripts(container) {
    container.querySelectorAll('script').forEach(oldScript => {
        const newScript = document.createElement('script');
        // Copiar atributos (type, src, etc.)
        Array.from(oldScript.attributes).forEach(attr =>
            newScript.setAttribute(attr.name, attr.value)
        );
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
}

async function loadComponents(activePage = '') {
    // Determinar página activa para resaltar enlace en sidebar
    const currentPath = activePage || window.location.pathname;

    try {
        // Cargar los tres componentes en paralelo
        const [navbarHtml, sidebarHtml, footerHtml] = await Promise.all([
            fetch('/components/navbar.html').then(r => {
                if (!r.ok) throw new Error(`navbar.html → HTTP ${r.status}`);
                return r.text();
            }),
            fetch('/components/sidebar.html').then(r => {
                if (!r.ok) throw new Error(`sidebar.html → HTTP ${r.status}`);
                return r.text();
            }),
            fetch('/components/footer.html').then(r => {
                if (!r.ok) throw new Error(`footer.html → HTTP ${r.status}`);
                return r.text();
            })
        ]);

        // Inyectar HTML
        const navbarEl  = document.getElementById('navbar-placeholder');
        const sidebarEl = document.getElementById('sidebar-placeholder');
        const footerEl  = document.getElementById('footer-placeholder');

        if (navbarEl)  { navbarEl.innerHTML  = navbarHtml;  _executeScripts(navbarEl);  }
        if (sidebarEl) { sidebarEl.innerHTML = sidebarHtml; _executeScripts(sidebarEl); }
        if (footerEl)  { footerEl.innerHTML  = footerHtml;  _executeScripts(footerEl);  }

        // Marcar enlace activo en sidebar
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            const page = link.getAttribute('data-page');
            if (page && currentPath.includes(page)) {
                link.classList.add('active');
            }
        });

        // Cargar info del usuario en el navbar ya insertado
        // (se llama tanto desde aquí como desde el propio navbar.html
        //  gracias a _executeScripts — sin duplicar, solo el segundo
        //  call sobreescribe con datos más frescos)
        await loadUserInfo();

    } catch (err) {
        console.error('[TICS] loadComponents error:', err.message);
    }
}

// ─── GUARDS DE AUTENTICACIÓN ─────────────────────────────────────────────────

function requireAuth() {
    if (!localStorage.getItem('token')) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// ─── INICIALIZACIÓN ──────────────────────────────────────────────────────────

// En páginas de login no hacer nada
const _isPublicPage = ['/', '/index.html', '/login.html']
    .some(p => window.location.pathname.endsWith(p.replace('/', '')));

if (!_isPublicPage) {
    // Verificar autenticación básica
    if (!localStorage.getItem('token')) {
        window.location.href = '/index.html';
    }
}