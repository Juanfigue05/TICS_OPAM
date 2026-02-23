// ============================================================================
// ARCHIVO: 2_FRONTEND/assets/js/main.js
// DESCRIPCIÓN: Utilidades globales y configuración
// ============================================================================

// Verificar autenticación
function checkAuth() {
    if (!API.token && !window.location.pathname.includes('../../index.html')) {
        window.location.href = '../../index.html';
        return false;
    }
    return true;
}

// Ejecutar al cargar cualquier página
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Función global para confirmar acciones
window.confirmAction = function(message) {
    return confirm(message);
};

// Helpers de formato
window.formatDate = function(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO');
};

window.formatDateTime = function(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-CO');
};

// Estilos de alerta personalizados para tu CSS
const alertStyles = `
    <style>
        .custom-alert {
            position: fixed;
            top: 90px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-xl);
            animation: slideInRight 0.3s ease-out;
        }
        .custom-alert.success {
            background: var(--status-active);
            color: white;
        }
        .custom-alert.error {
            background: var(--status-retired);
            color: white;
        }
        .custom-alert .close-btn {
            float: right;
            background: transparent;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            margin-left: 1rem;
        }
    </style>
`;

// Agregar estilos de alerta al documento
if (!document.getElementById('alert-styles')) {
    const style = document.createElement('div');
    style.id = 'alert-styles';
    style.innerHTML = alertStyles;
    document.head.appendChild(style);
}