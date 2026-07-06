/**
 * ============================================================
 * main.js
 * Orquestador principal de la aplicacion Acme Produccion
 * Maneja: login, navegacion SPA, layout, estado global
 * ============================================================
 */

import { dataManager } from './data/dataManager.js';
import './components/acme-toast.js';
import './components/acme-login.js';
import './components/acme-users.js';
import './components/acme-inventory.js';
import './components/acme-production.js';

console.log('[Main] Inicializando aplicacion Acme Produccion - Macondo');

// Estado global de la aplicacion
const AppState = {
    currentUser: null,
    currentModule: 'login',
    sidebarOpen: false,

    login(user) {
        this.currentUser = user;
        this.currentModule = 'dashboard';
        console.log('[AppState] Login:', user.nombreCompleto, '| modulo:', this.currentModule);
        saveSession(user);
        renderApp();
    },

    logout() {
        console.log('[AppState] Logout');
        this.currentUser = null;
        this.currentModule = 'login';
        clearSession();
        renderApp();
    },

    navigate(module) {
        this.currentModule = module;
        console.log('[AppState] Navegando a:', module);
        renderApp();
    },

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open', this.sidebarOpen);
        }
    }
};

// ---- Session Storage ----

function saveSession(user) {
    localStorage.setItem('acme_session', JSON.stringify(user));
}

function loadSession() {
    try {
        const data = localStorage.getItem('acme_session');
        if (data) {
            AppState.currentUser = JSON.parse(data);
            AppState.currentModule = 'dashboard';
            console.log('[Session] Sesion restaurada:', AppState.currentUser.nombreCompleto);
            return true;
        }
    } catch (e) {
        console.warn('[Session] Error cargando sesion:', e);
    }
    return false;
}

function clearSession() {
    localStorage.removeItem('acme_session');
}

// ---- Toast Helper ----

export function showToast(message, type = 'info') {
    const container = document.querySelector('acme-toast');
    if (container) {
        container.addToast(message, type);
    } else {
        console.log(`[Toast ${type}]`, message);
    }
}

// ---- Render Functions ----

function renderApp() {
    const app = document.getElementById('app');
    if (!app) return;

    if (!AppState.currentUser) {
        // Pantalla de login
        document.title = 'Acme Producción · Macondo';
        app.innerHTML = `
            <div class="login-screen">
                <acme-login></acme-login>
            </div>
            <acme-toast></acme-toast>
        `;
        setupLoginListener();
    } else {
        // Layout con sidebar
        document.title = 'Acme Producción · Macondo';
        app.innerHTML = `
            <button class="menu-toggle" id="menu-toggle">≡</button>
            <div class="app-layout">
                <aside class="sidebar" id="sidebar">
                    <div class="sidebar-header">
                        <h2>Acme &middot; Macondo</h2>
                        <div class="user-info">
                            <p class="user-name">${escapeHtmlMain(AppState.currentUser.nombreCompleto)}</p>
                            <p>${escapeHtmlMain(AppState.currentUser.cargo)}</p>
                        </div>
                    </div>
                    <nav class="sidebar-nav">
                        <a href="#" data-module="dashboard" class="${AppState.currentModule === 'dashboard' ? 'active' : ''}">
                            Panel General
                        </a>
                        <a href="#" data-module="inventory" class="${AppState.currentModule === 'inventory' ? 'active' : ''}">
                            Inventario
                        </a>
                        <a href="#" data-module="production" class="${AppState.currentModule === 'production' ? 'active' : ''}">
                            Producción
                        </a>
                        <a href="#" data-module="users" class="${AppState.currentModule === 'users' ? 'active' : ''}">
                            Usuarios
                        </a>
                    </nav>
                    <div class="sidebar-footer">
                        <button class="btn btn-outline w-full" id="logout-btn" style="color:#fff;border-color:rgba(255,255,255,0.3)">
                            Cerrar sesión
                        </button>
                    </div>
                </aside>
                <main class="main-content" id="main-content">
                    ${renderModule()}
                </main>
            </div>
            <acme-toast></acme-toast>
        `;
        setupLayoutListeners();
    }
}

function renderModule() {
    switch (AppState.currentModule) {
        case 'dashboard':
            return renderDashboard();
        case 'inventory':
            return '<acme-inventory></acme-inventory>';
        case 'production':
            return '<acme-production></acme-production>';
        case 'users':
            return '<acme-users></acme-users>';
        default:
            return renderDashboard();
    }
}

function renderDashboard() {
    return `
        <div class="page-header">
            <h2>Panel General</h2>
            <p>Resumen operativo de la planta Acme &mdash; Macondo</p>
        </div>
        <div class="stats-grid" id="dashboard-stats">
            <div class="stat-card">
                <div class="stat-label">Productos en Inventario</div>
                <div class="stat-value" id="stat-productos">&ndash;</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Materia Prima</div>
                <div class="stat-value" id="stat-mp">&ndash;</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Productos Terminados</div>
                <div class="stat-value" id="stat-pt">&ndash;</div>
            </div>
            <div class="stat-card stat-alert">
                <div class="stat-label">Con Stock Bajo</div>
                <div class="stat-value value-alert" id="stat-stock-bajo">&ndash;</div>
            </div>
        </div>
        <div class="card mb-3">
            <div class="card-header">
                <h3>Alertas de Stock Bajo</h3>
            </div>
            <div class="card-body">
                <ul class="alert-list" id="dashboard-alertas">
                    <li class="empty">Cargando...</li>
                </ul>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h3>Accesos Rápidos</h3>
            </div>
            <div class="card-body">
                <div class="btn-group">
                    <button class="btn btn-primary" onclick="window.appNavigate('inventory')">
                        Ver Inventario
                    </button>
                    <button class="btn btn-accent" onclick="window.appNavigate('production')">
                        Nueva Producción
                    </button>
                    <button class="btn btn-secondary" onclick="window.appNavigate('users')">
                        Gestionar Usuarios
                    </button>
                </div>
            </div>
        </div>
    `;
}

function escapeHtmlMain(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ---- Event Listeners ----

function setupLoginListener() {
    const loginEl = document.querySelector('acme-login');
    if (loginEl) {
        loginEl.addEventListener('login-success', (e) => {
            console.log('[Main] Evento login-success recibido');
            AppState.login(e.detail.user);
            showToast(`Bienvenido, ${e.detail.user.nombreCompleto}`, 'success');
        });
    }
}

function setupLayoutListeners() {
    // Navegacion del sidebar
    document.querySelectorAll('.sidebar-nav a[data-module]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const module = e.currentTarget.dataset.module;
            AppState.navigate(module);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AppState.logout();
            showToast('Sesion cerrada correctamente', 'info');
        });
    }

    // Menu toggle mobile
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            AppState.toggleSidebar();
        });
    }

    // Cargar stats del dashboard si estamos ahi
    if (AppState.currentModule === 'dashboard') {
        loadDashboardStats();
    }
}

// ---- Dashboard Stats ----

async function loadDashboardStats() {
    try {
        const [inventario, produccion] = await Promise.all([
            dataManager.obtenerInventario(),
            dataManager.obtenerProduccion()
        ]);

        const mp = inventario.filter(p => p.tipo === 'materia_prima').length;
        const pt = inventario.filter(p => p.tipo === 'producto_terminado').length;

        // Stock bajo: productos con stockMinimo definido y stock actual <= stockMinimo
        const conStockBajo = inventario.filter(p => {
            const minimo = parseFloat(p.stockMinimo);
            if (!minimo || minimo <= 0) return false;
            return (parseFloat(p.stock) || 0) <= minimo;
        });

        const elProductos = document.getElementById('stat-productos');
        const elMp = document.getElementById('stat-mp');
        const elPt = document.getElementById('stat-pt');
        const elStockBajo = document.getElementById('stat-stock-bajo');
        const elAlertas = document.getElementById('dashboard-alertas');

        if (elProductos) elProductos.textContent = inventario.length;
        if (elMp) elMp.textContent = mp;
        if (elPt) elPt.textContent = pt;
        if (elStockBajo) elStockBajo.textContent = conStockBajo.length;

        if (elAlertas) {
            if (conStockBajo.length === 0) {
                elAlertas.innerHTML = '<li class="empty">No hay productos por debajo de su stock mínimo.</li>';
            } else {
                elAlertas.innerHTML = conStockBajo.map(p => `
                    <li>
                        <span><strong>${escapeHtmlMain(p.nombre)}</strong> (${escapeHtmlMain(p.codigo)})</span>
                        <span>Stock: <strong>${p.stock ?? 0}${p.unidad ? ' ' + escapeHtmlMain(p.unidad) : ''}</strong> / mínimo ${p.stockMinimo}${p.unidad ? ' ' + escapeHtmlMain(p.unidad) : ''}</span>
                    </li>
                `).join('');
            }
        }

        console.log('[Dashboard] Stats cargadas:', { inventario: inventario.length, mp, pt, produccion: produccion.length, stockBajo: conStockBajo.length });
    } catch (err) {
        console.warn('[Dashboard] Error cargando stats:', err);
    }
}

// ---- Exponer navegacion global para botones inline ----

window.appNavigate = (module) => {
    AppState.navigate(module);
};

// ---- Inicializacion ----

function init() {
    console.log('[Main] Iniciando...');
    // Intentar restaurar sesion
    const hasSession = loadSession();
    if (hasSession) {
        console.log('[Main] Sesion previa encontrada, entrando al sistema');
    }
    renderApp();
}

// Iniciar cuando el DOM este listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Exportar para componentes
export { AppState, dataManager };
