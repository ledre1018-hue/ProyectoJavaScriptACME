/**
 * acme-users.js
 * Web Component: CRUD completo de Usuarios
 * - Listar todos los usuarios
 * - Crear usuario (ID, nombre, cargo, password con doble validacion)
 * - Editar usuario
 * - Eliminar usuario
 */

import { dataManager } from '../data/dataManager.js';
import { paginar, renderPaginacion, setBotonCargando, exportarCSV } from '../utils/ui.js';

const POR_PAGINA = 10;

class AcmeUsers extends HTMLElement {
    constructor() {
        super();
        this.usuarios = [];
        this.usuariosFiltrados = [];
        this.editandoKey = null;
        this.paginaActual = 1;
    }

    connectedCallback() {
        this.render();
        this.cargarUsuarios();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2>Gestión de Usuarios</h2>
                <p>Crear, editar o eliminar usuarios del sistema</p>
            </div>
            <div class="card mb-3">
                <div class="card-header">
                    <h3>${this.editandoKey ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                </div>
                <div class="card-body">
                    <form id="user-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Numero de Identificacion *</label>
                                <input type="text" id="u-ident" placeholder="Documento de identidad" required
                                    ${this.editandoKey ? 'disabled' : ''}>
                            </div>
                            <div class="form-group">
                                <label>Nombre Completo *</label>
                                <input type="text" id="u-nombre" placeholder="Nombre y apellidos" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Cargo *</label>
                                <select id="u-cargo" required>
                                    <option value="">Seleccione...</option>
                                    <option value="Administrador">Administrador</option>
                                    <option value="Supervisor de Produccion">Supervisor de Produccion</option>
                                    <option value="Operario">Operario</option>
                                    <option value="Auxiliar de Bodega">Auxiliar de Bodega</option>
                                    <option value="Jefe de Planta">Jefe de Planta</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Contrasena ${this.editandoKey ? '(dejar en blanco para no cambiar)' : '*'}</label>
                                <input type="password" id="u-pass" placeholder="${this.editandoKey ? 'Sin cambios' : 'Minimo 4 caracteres'}" 
                                    ${this.editandoKey ? '' : 'required minlength="4"'}>
                            </div>
                        </div>
                        ${this.editandoKey ? '' : `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Confirmar Contrasena *</label>
                                <input type="password" id="u-pass2" placeholder="Repita la contrasena" required minlength="4">
                                <div class="error-msg hidden" id="u-pass-error"></div>
                            </div>
                        </div>
                        `}
                        <div class="btn-group">
                            <button type="submit" class="btn btn-primary" id="u-submit">
                                ${this.editandoKey ? 'Guardar Cambios' : 'Crear Usuario'}
                            </button>
                            ${this.editandoKey ? `
                                <button type="button" class="btn btn-outline" id="u-cancel">Cancelar</button>
                            ` : ''}
                        </div>
                    </form>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>Lista de Usuarios</h3>
                    <div class="d-flex gap-2 items-center flex-wrap">
                        <div class="search-bar">
                            <input type="text" id="u-search" placeholder="Buscar usuario...">
                        </div>
                        <button type="button" class="btn btn-outline btn-sm" id="u-export">Exportar CSV</button>
                    </div>
                </div>
                <div class="card-body" style="padding:0">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Cargo</th>
                                    <th style="text-align:center;width:170px">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="users-tbody">
                                <tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:2rem">Cargando usuarios...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="pagination" id="u-pagination"></div>
                </div>
            </div>
        `;
        this.setupListeners();
    }

    setupListeners() {
        // Formulario
        const form = this.querySelector('#user-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarUsuario();
            });
        }

        // Cancelar edicion
        const cancel = this.querySelector('#u-cancel');
        if (cancel) {
            cancel.addEventListener('click', () => {
                this.editandoKey = null;
                this.render();
            });
        }

        // Busqueda
        const search = this.querySelector('#u-search');
        if (search) {
            search.addEventListener('input', (e) => {
                this.filtrarUsuarios(e.target.value);
            });
        }

        // Exportar CSV
        const exportBtn = this.querySelector('#u-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportarUsuarios());
        }

        // Validacion en tiempo real de contrasenas (solo en creacion)
        if (!this.editandoKey) {
            const pass2 = this.querySelector('#u-pass2');
            const pass = this.querySelector('#u-pass');
            if (pass2 && pass) {
                const validar = () => {
                    const err = this.querySelector('#u-pass-error');
                    if (pass2.value && pass.value !== pass2.value) {
                        err.textContent = 'Las contrasenas no coinciden';
                        err.classList.remove('hidden');
                        pass2.classList.add('error');
                    } else {
                        err.classList.add('hidden');
                        pass2.classList.remove('error');
                    }
                };
                pass2.addEventListener('input', validar);
                pass.addEventListener('input', validar);
            }
        }
    }

    async cargarUsuarios() {
        try {
            console.log('[Users] Cargando usuarios...');
            this.usuarios = await dataManager.obtenerUsuarios();
            this.usuariosFiltrados = this.usuarios;
            console.log('[Users]', this.usuarios.length, 'usuarios cargados');
            this.paginaActual = 1;
            this.renderTabla(this.usuariosFiltrados);
        } catch (err) {
            console.error('[Users] Error cargando usuarios:', err);
            this.mostrarToast('Error al cargar usuarios', 'error');
        }
    }

    exportarUsuarios() {
        const headers = ['Identificacion', 'Nombre Completo', 'Cargo', 'Fecha de Registro'];
        const rows = this.usuariosFiltrados.map(u => [
            u.identificacion || '', u.nombreCompleto || '', u.cargo || '', u.fechaRegistro || ''
        ]);
        exportarCSV('usuarios_acme.csv', headers, rows);
    }

    renderTabla(lista) {
        const tbody = this.querySelector('#users-tbody');
        const pagContainer = this.querySelector('#u-pagination');
        if (!tbody) return;

        if (lista.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <p>No hay usuarios registrados</p>
                    </td>
                </tr>
            `;
            if (pagContainer) pagContainer.innerHTML = '';
            return;
        }

        const { items, paginaActual, totalPaginas, total } = paginar(lista, this.paginaActual, POR_PAGINA);
        this.paginaActual = paginaActual;

        if (pagContainer) {
            renderPaginacion(pagContainer, { paginaActual, totalPaginas, total, porPagina: POR_PAGINA }, (nuevaPagina) => {
                this.paginaActual = nuevaPagina;
                this.renderTabla(lista);
            });
        }

        tbody.innerHTML = items.map(u => `
            <tr data-key="${u._firebaseKey || ''}">
                <td><strong>${this.escapeHtml(u.identificacion)}</strong></td>
                <td>${this.escapeHtml(u.nombreCompleto)}</td>
                <td><span class="badge badge-pt">${this.escapeHtml(u.cargo)}</span></td>
                <td style="text-align:center">
                    <div class="btn-group" style="justify-content:center">
                        <button class="btn btn-sm btn-primary btn-edit" data-key="${u._firebaseKey}" title="Editar">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete" data-key="${u._firebaseKey}" title="Eliminar">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Eventos de botones
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.iniciarEdicion(btn.dataset.key));
        });
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.confirmarEliminar(btn.dataset.key));
        });
    }

    filtrarUsuarios(query) {
        const q = query.toLowerCase().trim();
        this.usuariosFiltrados = !q ? this.usuarios : this.usuarios.filter(u =>
            (u.identificacion || '').toLowerCase().includes(q) ||
            (u.nombreCompleto || '').toLowerCase().includes(q) ||
            (u.cargo || '').toLowerCase().includes(q)
        );
        this.paginaActual = 1;
        this.renderTabla(this.usuariosFiltrados);
    }

    async guardarUsuario() {
        const ident = this.querySelector('#u-ident').value.trim();
        const nombre = this.querySelector('#u-nombre').value.trim();
        const cargo = this.querySelector('#u-cargo').value;
        const pass = this.querySelector('#u-pass').value;
        const pass2 = this.editandoKey ? pass : this.querySelector('#u-pass2').value;
        const btnSubmit = this.querySelector('#u-submit');

        // Validaciones
        if (!nombre || !cargo) {
            this.mostrarToast('Nombre y cargo son obligatorios', 'error');
            return;
        }

        if (!this.editandoKey) {
            // Crear: validar ID y passwords
            if (!ident) {
                this.mostrarToast('La identificacion es obligatoria', 'error');
                return;
            }
            if (!pass || pass.length < 4) {
                this.mostrarToast('La contrasena debe tener minimo 4 caracteres', 'error');
                return;
            }
            if (pass !== pass2) {
                this.mostrarToast('Las contrasenas no coinciden', 'error');
                return;
            }
        } else {
            // Editar: si hay password, validar longitud
            if (pass && pass.length < 4) {
                this.mostrarToast('La contrasena debe tener minimo 4 caracteres', 'error');
                return;
            }
        }

        setBotonCargando(btnSubmit, true);
        try {
            if (this.editandoKey) {
                // Actualizar
                const datos = { nombreCompleto: nombre, cargo };
                if (pass) datos.password = pass;

                await dataManager.actualizarUsuario(this.editandoKey, datos);
                console.log('[Users] Usuario actualizado:', this.editandoKey);
                this.mostrarToast('Usuario actualizado correctamente', 'success');
                this.editandoKey = null;
            } else {
                // Crear: verificar que no exista
                const existe = this.usuarios.some(u => u.identificacion === ident);
                if (existe) {
                    this.mostrarToast('Ya existe un usuario con esa identificacion', 'error');
                    return;
                }

                await dataManager.crearUsuario({
                    identificacion: ident,
                    nombreCompleto: nombre,
                    cargo: cargo,
                    password: pass,
                    fechaRegistro: new Date().toISOString()
                });
                console.log('[Users] Usuario creado:', ident);
                this.mostrarToast('Usuario creado correctamente', 'success');
            }

            this.render();
            await this.cargarUsuarios();

        } catch (err) {
            console.error('[Users] Error guardando usuario:', err);
            this.mostrarToast('Error al guardar usuario', 'error');
        } finally {
            setBotonCargando(btnSubmit, false);
        }
    }

    iniciarEdicion(key) {
        const usuario = this.usuarios.find(u => u._firebaseKey === key);
        if (!usuario) return;

        this.editandoKey = key;
        this.render();

        // Llenar formulario
        this.querySelector('#u-ident').value = usuario.identificacion;
        this.querySelector('#u-nombre').value = usuario.nombreCompleto;
        this.querySelector('#u-cargo').value = usuario.cargo;
    }

    confirmarEliminar(key) {
        const usuario = this.usuarios.find(u => u._firebaseKey === key);
        if (!usuario) return;

        if (confirm(`¿Eliminar al usuario "${usuario.nombreCompleto}"?\n\nEsta accion no se puede deshacer.`)) {
            this.eliminarUsuario(key);
        }
    }

    async eliminarUsuario(key) {
        try {
            await dataManager.eliminarUsuario(key);
            console.log('[Users] Usuario eliminado:', key);
            this.mostrarToast('Usuario eliminado correctamente', 'success');
            await this.cargarUsuarios();
        } catch (err) {
            console.error('[Users] Error eliminando usuario:', err);
            this.mostrarToast('Error al eliminar usuario', 'error');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    mostrarToast(msg, type) {
        const toast = document.querySelector('acme-toast');
        if (toast) toast.addToast(msg, type);
        else console.log(`[Toast ${type}]`, msg);
    }
}

customElements.define('acme-users', AcmeUsers);
