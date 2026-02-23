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

window.logout = function () {
    if (confirm('¿Cerrar sesión?')) {
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

// Páginas que NO requieren autenticación obligatoria
const _isPublicPage = ['/', '/index.html', '/login.html', '/dispositivo.html']
    .some(p => window.location.pathname.endsWith(p.replace('/', '')));

if (!_isPublicPage) {
    if (!localStorage.getItem('token')) {
        window.location.href = '/index.html';
    }
}

// ─── QR MODAL ────────────────────────────────────────────────────────────────
// Uso: openQRModal('computador', 5, 'HP EliteBook 840')
// Tipos válidos: computador | celular | impresora | radio | telefono_ip | tablet | accesorio
// ─────────────────────────────────────────────────────────────────────────────

let _qrTipo = null, _qrId = null, _qrSvgContent = null;

async function openQRModal(tipo, id, nombre) {
    _qrTipo = tipo; _qrId = id; _qrSvgContent = null;

    const prev = document.getElementById('_qrModalOverlay');
    if (prev) prev.remove();

    const deviceUrl = `${window.location.origin}/dispositivo.html?tipo=${tipo}&id=${id}`;
    const nombreMostrar = (nombre || tipo).length > 38
        ? (nombre || tipo).slice(0, 38) + '…' : (nombre || tipo);

    const overlay = document.createElement('div');
    overlay.id = '_qrModalOverlay';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:9999;
        display:flex;align-items:center;justify-content:center;
        background:rgba(0,0,0,.65);backdrop-filter:blur(5px);
        animation:_cfIn .15s ease;
    `;

    overlay.innerHTML = `
        <div style="
            background:var(--clr-surface,#1a1f2e);
            border:1px solid var(--clr-border,rgba(255,255,255,.1));
            border-radius:18px; padding:2rem;
            max-width:420px; width:calc(100vw - 2.5rem);
            box-shadow:0 30px 70px rgba(0,0,0,.6);
            animation:_cfSlide .22s cubic-bezier(.34,1.56,.64,1);
        ">
            <!-- Encabezado -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;">
                <div>
                    <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;
                                letter-spacing:.1em;color:var(--clr-primary);margin-bottom:.3rem;">
                        📱 Código QR del Dispositivo
                    </div>
                    <div style="font-weight:700;font-size:.95rem;color:var(--clr-text);">${nombreMostrar}</div>
                </div>
                <button onclick="closeQRModal()" style="
                    background:var(--clr-surface-2,#252b3b);border:1px solid var(--clr-border);
                    border-radius:8px;cursor:pointer;color:var(--clr-text-muted);
                    width:30px;height:30px;font-size:1.1rem;line-height:1;
                    display:flex;align-items:center;justify-content:center;
                " title="Cerrar">×</button>
            </div>

            <!-- Imagen QR -->
            <div id="_qrImgWrap" style="
                background:#ffffff;border-radius:14px;padding:1.25rem;
                display:flex;align-items:center;justify-content:center;
                min-height:220px;margin-bottom:1.25rem;
            ">
                <div style="text-align:center;color:#94a3b8;font-size:.82rem;">
                    <div style="font-size:2rem;margin-bottom:.6rem;">⏳</div>
                    Generando QR...
                </div>
            </div>

            <!-- URL pública -->
            <div style="
                background:var(--clr-surface-2,#252b3b);
                border:1px solid var(--clr-border);border-radius:8px;
                padding:.55rem .75rem;margin-bottom:1.25rem;
                display:flex;align-items:center;gap:.6rem;
            ">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="var(--clr-primary)" stroke-width="2" style="flex-shrink:0;">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span style="
                    font-family:var(--font-mono,monospace);font-size:.68rem;
                    color:var(--clr-text-muted);flex:1;word-break:break-all;
                    line-height:1.4;
                ">${deviceUrl}</span>
                <button onclick="navigator.clipboard.writeText('${deviceUrl}').then(()=>showSuccess('URL copiada'))"
                    title="Copiar URL" style="
                    background:none;border:none;cursor:pointer;
                    color:var(--clr-text-faint);padding:.2rem;flex-shrink:0;
                ">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                </button>
            </div>

            <!-- Acciones -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;">
                <button onclick="_qrDownloadSvg()" style="
                    padding:.65rem;border-radius:9px;
                    border:1px solid var(--clr-border);
                    background:var(--clr-surface-2,#252b3b);color:var(--clr-text);
                    font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;
                    display:flex;align-items:center;justify-content:center;gap:.45rem;
                    transition:background .15s;
                " onmouseover="this.style.background='var(--clr-surface-3,#2e3548)'"
                   onmouseout="this.style.background='var(--clr-surface-2,#252b3b)'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Descargar SVG
                </button>
                <button onclick="_qrSaveToDB()" id="_qrSaveBtn" style="
                    padding:.65rem;border-radius:9px;border:none;
                    background:var(--clr-primary,#2b7fff);color:#fff;
                    font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;
                    display:flex;align-items:center;justify-content:center;gap:.45rem;
                    transition:background .15s;
                " onmouseover="this.style.background='#1d6aee'"
                   onmouseout="this.style.background='var(--clr-primary,#2b7fff)'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Guardar en BD
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeQRModal(); });
    document.addEventListener('keydown', _qrEscHandler);

    // Generar QR desde el backend
    try {
        const svgRes = await fetch(`/api/public/qr?url=${encodeURIComponent(deviceUrl)}`);
        if (!svgRes.ok) throw new Error('QR generation failed');
        _qrSvgContent = await svgRes.text();
        const wrap = document.getElementById('_qrImgWrap');
        if (wrap) {
            wrap.innerHTML = _qrSvgContent;
            const svgEl = wrap.querySelector('svg');
            if (svgEl) { svgEl.setAttribute('width','240'); svgEl.setAttribute('height','240'); }
        }
    } catch (err) {
        const wrap = document.getElementById('_qrImgWrap');
        if (wrap) wrap.innerHTML = `<div style="color:#ef4444;font-size:.8rem;text-align:center;color:#1e293b;">
            Error al generar QR. Verifica que el servidor esté activo.</div>`;
    }
}

function _qrEscHandler(e) { if (e.key === 'Escape') closeQRModal(); }

function closeQRModal() {
    const el = document.getElementById('_qrModalOverlay');
    if (el) el.remove();
    document.removeEventListener('keydown', _qrEscHandler);
}

function _qrDownloadSvg() {
    if (!_qrSvgContent) { showError('El QR aún no se ha generado.'); return; }
    const blob = new Blob([_qrSvgContent], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${_qrTipo}-${_qrId}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
    showSuccess('QR descargado como SVG.');
}

async function _qrSaveToDB() {
    if (!_qrSvgContent) { showError('El QR aún no se ha generado.'); return; }
    const btn = document.getElementById('_qrSaveBtn');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
    try {
        const res = await API.request(`/dispositivos/${_qrTipo}/${_qrId}/guardar-qr`, {
            method: 'POST',
            body: JSON.stringify({ qr_svg: _qrSvgContent })
        });
        if (res.success) {
            showSuccess('QR guardado en la base de datos.');
            if (btn) {
                btn.style.background = '#10b981';
                btn.innerHTML = '✔ Guardado';
                setTimeout(() => { if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; btn.style.background = ''; } }, 2500);
            }
        } else throw new Error(res.error || 'Error desconocido');
    } catch (err) {
        showError('No se pudo guardar el QR: ' + err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
    }
}