/**
 * acme-login.js
 * Web Component: Login y Registro de Usuarios
 * - Login por identificacion + contrasena
 * - Registro con: ID, nombre, cargo, contrasena + doble validacion de contrasena
 * - Conectado a Firebase via dataManager
 */

import { dataManager } from '../data/dataManager.js';
import { setBotonCargando } from '../utils/ui.js';

class AcmeLogin extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.modo = 'login'; // 'login' | 'registro'
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                @import url('./style.css');
                :host {
                    display: block;
                    width: 100%;
                    max-width: 420px;
                }
                .login-box {
                    background: #fff;
                    border-radius: 4px;
                    box-shadow: 0 8px 24px rgba(27,36,48,0.14);
                    border-top: 3px solid #8a5a2b;
                    padding: 2.75rem 2.5rem;
                    animation: slideUp 0.35s ease;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(14px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .logo {
                    text-align: center;
                    margin-bottom: 1.75rem;
                }
                .logo h1 {
                    font-size: 1.5rem;
                    color: #1b2430;
                    font-weight: 700;
                    font-family: 'Source Serif 4', Georgia, serif;
                }
                .logo p {
                    color: #5b6577;
                    font-size: 0.8125rem;
                    margin-top: 0.35rem;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .tabs {
                    display: flex;
                    gap: 0;
                    margin-bottom: 1.75rem;
                    border-bottom: 1px solid #e1ddd3;
                }
                .tab {
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    background: none;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: #8b93a1;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    margin-bottom: -1px;
                    transition: 0.2s;
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .tab.active {
                    color: #1b2430;
                    border-bottom-color: #8a5a2b;
                }
                .tab:hover:not(.active) { color: #5b6577; }
                .form-group {
                    margin-bottom: 1rem;
                }
                .form-group label {
                    display: block;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 0.375rem;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                }
                .form-group input,
                .form-group select {
                    width: 100%;
                    padding: 0.625rem 0.875rem;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    transition: 0.2s;
                    background: #fff;
                    color: #111827;
                }
                .form-group input:focus,
                .form-group select:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
                }
                .form-group input::placeholder { color: #9ca3af; }
                input.error {
                    border-color: #dc2626 !important;
                    background: #fef2f2 !important;
                }
                .error-msg {
                    color: #dc2626;
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                }
                .help-text {
                    color: #9ca3af;
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                }
                .btn {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid transparent;
                    border-radius: 3px;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    font-family: 'Inter', system-ui, sans-serif;
                    cursor: pointer;
                    transition: 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    position: relative;
                }
                .btn-primary {
                    background: #2c3e50;
                    color: #fff;
                }
                .btn-primary:hover { background: #1b2733; }
                .btn-secondary {
                    background: #2f6659;
                    color: #fff;
                }
                .btn-secondary:hover { background: #234d43; }
                .btn:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
                .btn.is-loading { color: transparent !important; pointer-events: none; }
                .btn.is-loading::after {
                    content: "";
                    position: absolute;
                    width: 15px; height: 15px;
                    border: 2px solid rgba(255,255,255,0.4);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .hidden { display: none !important; }
                @media (max-width: 480px) {
                    .login-box { padding: 1.75rem 1.5rem; }
                }
            </style>
            <div class="login-box">
                <div class="logo">
                    <h1>Acme Producción</h1>
                    <p>Planta Macondo</p>
                </div>
                <div class="tabs">
                    <button class="tab ${this.modo === 'login' ? 'active' : ''}" data-tab="login">
                        Iniciar Sesión
                    </button>
                    <button class="tab ${this.modo === 'registro' ? 'active' : ''}" data-tab="registro">
                        Registrarse
                    </button>
                </div>

                <!-- FORMULARIO LOGIN -->
                <form id="form-login" class="${this.modo === 'login' ? '' : 'hidden'}">
                    <div class="form-group">
                        <label for="login-ident">Numero de Identificacion</label>
                        <input type="text" id="login-ident" placeholder="Ej: 123456789" required autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label for="login-pass">Contrasena</label>
                        <input type="password" id="login-pass" placeholder="Tu contrasena" required autocomplete="current-password">
                    </div>
                    <button type="submit" class="btn btn-primary" id="btn-login-submit">Entrar al Sistema</button>
                </form>

                <!-- FORMULARIO REGISTRO -->
                <form id="form-registro" class="${this.modo === 'registro' ? '' : 'hidden'}">
                    <div class="form-group">
                        <label for="reg-ident">Numero de Identificacion *</label>
                        <input type="text" id="reg-ident" placeholder="Documento de identidad" required>
                    </div>
                    <div class="form-group">
                        <label for="reg-nombre">Nombre Completo *</label>
                        <input type="text" id="reg-nombre" placeholder="Nombre y apellidos" required>
                    </div>
                    <div class="form-group">
                        <label for="reg-cargo">Cargo *</label>
                        <select id="reg-cargo" required>
                            <option value="">Seleccione un cargo...</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Supervisor de Produccion">Supervisor de Produccion</option>
                            <option value="Operario">Operario</option>
                            <option value="Auxiliar de Bodega">Auxiliar de Bodega</option>
                            <option value="Jefe de Planta">Jefe de Planta</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="reg-pass">Contrasena *</label>
                        <input type="password" id="reg-pass" placeholder="Minimo 4 caracteres" required minlength="4">
                        <small class="help-text">Minimo 4 caracteres</small>
                    </div>
                    <div class="form-group">
                        <label for="reg-pass2">Confirmar Contrasena *</label>
                        <input type="password" id="reg-pass2" placeholder="Repita la contrasena" required minlength="4">
                        <div class="error-msg hidden" id="reg-error"></div>
                    </div>
                    <button type="submit" class="btn btn-secondary" id="btn-registro-submit">Crear Cuenta</button>
                </form>
            </div>
        `;
    }

    setupListeners() {
        // Tabs
        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.modo = e.currentTarget.dataset.tab;
                this.render();
                this.setupListeners();
            });
        });

        // Login
        const formLogin = this.shadowRoot.getElementById('form-login');
        if (formLogin) {
            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // Registro
        const formReg = this.shadowRoot.getElementById('form-registro');
        if (formReg) {
            formReg.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegistro();
            });

            // Validacion en tiempo real de contrasenas
            const pass2 = this.shadowRoot.getElementById('reg-pass2');
            if (pass2) {
                pass2.addEventListener('input', () => this.validarPasswords());
            }
            const pass1 = this.shadowRoot.getElementById('reg-pass');
            if (pass1) {
                pass1.addEventListener('input', () => this.validarPasswords());
            }
        }
    }

    validarPasswords() {
        const pass = this.shadowRoot.getElementById('reg-pass');
        const pass2 = this.shadowRoot.getElementById('reg-pass2');
        const error = this.shadowRoot.getElementById('reg-error');

        if (!pass || !pass2 || !error) return false;

        // Reset
        pass.classList.remove('error');
        pass2.classList.remove('error');
        error.classList.add('hidden');
        error.textContent = '';

        const v1 = pass.value;
        const v2 = pass2.value;

        if (v2 && v1 !== v2) {
            pass2.classList.add('error');
            error.textContent = 'Las contrasenas no coinciden';
            error.classList.remove('hidden');
            return false;
        }

        if (v1 && v1.length < 4) {
            pass.classList.add('error');
            error.textContent = 'La contrasena debe tener minimo 4 caracteres';
            error.classList.remove('hidden');
            return false;
        }

        return true;
    }

    async handleLogin() {
        const identInput = this.shadowRoot.getElementById('login-ident');
        const passInput = this.shadowRoot.getElementById('login-pass');
        const btnSubmit = this.shadowRoot.getElementById('btn-login-submit');
        const ident = identInput.value.trim();
        const pass = passInput.value;

        console.log('[Login] Intentando login:', ident);
        setBotonCargando(btnSubmit, true);

        try {
            const usuarios = await dataManager.obtenerUsuarios();
            console.log('[Login] Usuarios cargados:', usuarios.length);

            const user = usuarios.find(u =>
                u.identificacion === ident && u.password === pass
            );

            if (user) {
                console.log('[Login] Usuario autenticado:', user.nombreCompleto);
                // Limpiar form
                identInput.value = '';
                passInput.value = '';
                // Emitir evento
                this.dispatchEvent(new CustomEvent('login-success', {
                    detail: { user },
                    bubbles: true,
                    composed: true
                }));
            } else {
                console.warn('[Login] Credenciales invalidas');
                this.mostrarErrorLogin('Identificacion o contrasena incorrectas');
                passInput.value = '';
                passInput.focus();
            }
        } catch (err) {
            console.error('[Login] Error:', err);
            this.mostrarErrorLogin('Error de conexion. Intente de nuevo.');
        } finally {
            setBotonCargando(btnSubmit, false);
        }
    }

    async handleRegistro() {
        const identInput = this.shadowRoot.getElementById('reg-ident');
        const nombreInput = this.shadowRoot.getElementById('reg-nombre');
        const cargoInput = this.shadowRoot.getElementById('reg-cargo');
        const passInput = this.shadowRoot.getElementById('reg-pass');
        const pass2Input = this.shadowRoot.getElementById('reg-pass2');
        const errorDiv = this.shadowRoot.getElementById('reg-error');
        const btnSubmit = this.shadowRoot.getElementById('btn-registro-submit');

        const ident = identInput.value.trim();
        const nombre = nombreInput.value.trim();
        const cargo = cargoInput.value;
        const pass = passInput.value;
        const pass2 = pass2Input.value;

        // Reset errores
        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';

        // Validaciones
        if (!ident || !nombre || !cargo || !pass || !pass2) {
            errorDiv.textContent = 'Todos los campos son obligatorios';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (pass.length < 4) {
            errorDiv.textContent = 'La contrasena debe tener minimo 4 caracteres';
            errorDiv.classList.remove('hidden');
            passInput.classList.add('error');
            return;
        }

        if (pass !== pass2) {
            errorDiv.textContent = 'Las contrasenas no coinciden';
            errorDiv.classList.remove('hidden');
            pass2Input.classList.add('error');
            return;
        }

        console.log('[Registro] Creando usuario:', ident, nombre);
        setBotonCargando(btnSubmit, true);

        try {
            // Verificar que no exista
            const usuarios = await dataManager.obtenerUsuarios();
            const existe = usuarios.some(u => u.identificacion === ident);
            if (existe) {
                errorDiv.textContent = 'Ya existe un usuario con esa identificacion';
                errorDiv.classList.remove('hidden');
                return;
            }

            // Crear usuario
            const nuevoUsuario = {
                identificacion: ident,
                nombreCompleto: nombre,
                cargo: cargo,
                password: pass,
                fechaRegistro: new Date().toISOString()
            };

            const key = await dataManager.crearUsuario(nuevoUsuario);
            console.log('[Registro] Usuario creado, key:', key);

            // Limpiar form y cambiar a login
            identInput.value = '';
            nombreInput.value = '';
            cargoInput.value = '';
            passInput.value = '';
            pass2Input.value = '';

            this.modo = 'login';
            this.render();
            this.setupListeners();

            // Mostrar mensaje de exito
            this.showToastInMain('Usuario registrado correctamente. Ahora puede iniciar sesion.', 'success');

        } catch (err) {
            console.error('[Registro] Error:', err);
            errorDiv.textContent = 'Error al registrar usuario. Intente de nuevo.';
            errorDiv.classList.remove('hidden');
        } finally {
            setBotonCargando(btnSubmit, false);
        }
    }

    mostrarErrorLogin(msg) {
        // Crear toast manualmente ya que estamos en shadow DOM
        const toast = document.createElement('div');
        toast.style.cssText = `
            position:fixed;top:1rem;right:1rem;z-index:99999;
            background:#dc2626;color:#fff;padding:1rem 1.25rem;
            border-radius:8px;font-family:'Segoe UI',sans-serif;
            font-size:0.875rem;font-weight:500;box-shadow:0 10px 15px rgba(0,0,0,0.15);
            animation:toastIn 0.3s ease;cursor:pointer;
        `;
        toast.textContent = msg;
        toast.addEventListener('click', () => toast.remove());
        document.body.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }

    showToastInMain(message, type) {
        // Intentar usar el toast global
        const toastContainer = document.querySelector('acme-toast');
        if (toastContainer) {
            toastContainer.addToast(message, type);
        } else {
            // Fallback: crear toast temporal
            const toast = document.createElement('div');
            const bg = type === 'success' ? '#059669' : '#1a56db';
            toast.style.cssText = `
                position:fixed;top:1rem;right:1rem;z-index:99999;
                background:${bg};color:#fff;padding:1rem 1.25rem;
                border-radius:8px;font-family:'Segoe UI',sans-serif;
                font-size:0.875rem;font-weight:500;box-shadow:0 10px 15px rgba(0,0,0,0.15);
                animation:toastIn 0.3s ease;cursor:pointer;
            `;
            toast.textContent = message;
            toast.addEventListener('click', () => toast.remove());
            document.body.appendChild(toast);
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
        }
    }
}

customElements.define('acme-login', AcmeLogin);
