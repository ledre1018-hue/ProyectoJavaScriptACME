/**
 * acme-production.js
 * Web Component: Motor de Produccion
 * - Seleccionar producto terminado a fabricar
 * - Ingresar cantidad deseada
 * - Validar stock de materia prima segun formula
 * - Ejecutar: restar MP, sumar PT, generar consecutivo, guardar registro
 * - Mostrar resumen de produccion
 */

import { dataManager } from '../data/dataManager.js';
import { paginar, renderPaginacion, setBotonCargando, exportarCSV, obtenerUsuarioSesion } from '../utils/ui.js';

const POR_PAGINA = 8;

class AcmeProduction extends HTMLElement {
    constructor() {
        super();
        this.productosTerminados = [];
        this.materiasPrimas = [];
        this.inventarioCompleto = [];
        this.historialCompleto = [];
        this.historialFiltrado = [];
        this.paginaActual = 1;
        this.ultimoResumen = null;
    }

    connectedCallback() {
        this.render();
        this.cargarDatos();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2>Módulo de Producción</h2>
                <p>Transforme materia prima en productos terminados</p>
            </div>

            <!-- FORMULARIO DE PRODUCCION -->
            <div class="card mb-3">
                <div class="card-header">
                    <h3>Nueva Orden de Producción</h3>
                </div>
                <div class="card-body">
                    <form id="prod-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Producto a Fabricar *</label>
                                <select id="prod-producto" required>
                                    <option value="">Seleccione un producto terminado...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Cantidad a Producir *</label>
                                <input type="number" id="prod-cantidad" placeholder="Ej: 10" required min="1" value="1">
                            </div>
                        </div>

                        <!-- PREVIEW DE FORMULA -->
                        <div id="formula-preview" style="display:none;margin-top:1rem;padding:1rem;background:#f7f6f3;border-radius:3px;border:1px solid #e1ddd3;">
                            <h4 style="font-size:0.8125rem;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:#1b2430;margin-bottom:0.75rem;">Materia Prima Requerida</h4>
                            <div id="formula-preview-content"></div>
                        </div>

                        <div class="btn-group mt-2">
                            <button type="submit" class="btn btn-accent btn-lg" id="prod-submit">Iniciar Producción</button>
                        </div>
                        <div class="error-msg hidden" id="prod-error" style="margin-top:0.75rem;"></div>
                    </form>
                </div>
            </div>

            <!-- RESUMEN DE ULTIMA PRODUCCION -->
            <div id="resumen-container" style="display:none">
                <div class="production-summary">
                    <h4>Producción Completada</h4>
                    <div id="resumen-content"></div>
                </div>
            </div>

            <!-- HISTORIAL DE PRODUCCION -->
            <div class="card mt-3">
                <div class="card-header">
                    <h3>Historial de Producción</h3>
                    <div class="d-flex gap-2 items-center flex-wrap">
                        <div class="search-bar">
                            <input type="text" id="prod-search" placeholder="Buscar por código o producto...">
                        </div>
                        <button type="button" class="btn btn-outline btn-sm" id="prod-export">Exportar CSV</button>
                    </div>
                </div>
                <div class="card-body" style="padding:0">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Código Prod.</th>
                                    <th>Producto Fabricado</th>
                                    <th style="text-align:right">Cantidad</th>
                                    <th>MP Consumida</th>
                                    <th>Producido por</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody id="prod-tbody">
                                <tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:2rem">Cargando historial...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="pagination" id="prod-pagination"></div>
                </div>
            </div>
        `;
        this.setupListeners();
    }

    setupListeners() {
        // Formulario
        const form = this.querySelector('#prod-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.ejecutarProduccion();
            });
        }

        // Cambio de producto: mostrar preview de formula
        const select = this.querySelector('#prod-producto');
        if (select) {
            select.addEventListener('change', () => this.mostrarPreviewFormula(select.value));
        }

        // Busqueda en historial
        const search = this.querySelector('#prod-search');
        if (search) {
            search.addEventListener('input', (e) => {
                this.filtrarHistorial(e.target.value);
            });
        }

        // Exportar CSV
        const exportBtn = this.querySelector('#prod-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportarHistorial());
        }
    }

    exportarHistorial() {
        const headers = ['Codigo', 'Producto', 'Cantidad', 'MP Consumida', 'Producido por', 'Fecha'];
        const rows = this.historialFiltrado.map(r => [
            r.codigo || '', `${r.nombreProducto || ''} (${r.codigoProducto || ''})`,
            r.cantidadProducida || 0,
            (r.materiaPrimaConsumida || []).map(mc => `${mc.nombre}: ${mc.cantidad}`).join(' | '),
            r.usuarioNombre || r.usuario || '-',
            r.fecha ? new Date(r.fecha).toLocaleString('es-CO') : ''
        ]);
        exportarCSV('historial_produccion_acme.csv', headers, rows);
    }

    async cargarDatos() {
        try {
            console.log('[Production] Cargando datos...');
            const [inventario, produccion] = await Promise.all([
                dataManager.obtenerInventario(),
                dataManager.obtenerProduccion()
            ]);

            this.inventarioCompleto = inventario;
            this.productosTerminados = inventario.filter(p => p.tipo === 'producto_terminado');
            this.materiasPrimas = inventario.filter(p => p.tipo === 'materia_prima');

            console.log('[Production]', this.productosTerminados.length, 'PT |', this.materiasPrimas.length, 'MP');

            this.actualizarSelectProducto();
            this.historialCompleto = produccion.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            this.historialFiltrado = this.historialCompleto;
            this.paginaActual = 1;
            this.renderHistorial(this.historialFiltrado);
        } catch (err) {
            console.error('[Production] Error cargando datos:', err);
            this.mostrarToast('Error al cargar datos de produccion', 'error');
        }
    }

    actualizarSelectProducto() {
        const select = this.querySelector('#prod-producto');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccione un producto terminado...</option>' +
            this.productosTerminados.map(p => {
                const tieneFormula = p.formula && p.formula.length > 0;
                return `<option value="${p._firebaseKey}" ${!tieneFormula ? 'disabled' : ''}>
                    ${p.codigo} - ${p.nombre} ${!tieneFormula ? '(Sin formula)' : ''}
                </option>`;
            }).join('');
    }

    mostrarPreviewFormula(productoKey) {
        const preview = this.querySelector('#formula-preview');
        const content = this.querySelector('#formula-preview-content');
        if (!preview || !content) return;

        if (!productoKey) {
            preview.style.display = 'none';
            return;
        }

        const prod = this.productosTerminados.find(p => p._firebaseKey === productoKey);
        if (!prod || !prod.formula) {
            preview.style.display = 'none';
            return;
        }

        const cantidad = parseInt(this.querySelector('#prod-cantidad').value) || 1;

        const filas = prod.formula.map(f => {
            const mp = this.materiasPrimas.find(m => m.codigo === f.codigoMP);
            const nombreMP = mp ? mp.nombre : f.codigoMP;
            const unidadMP = mp && mp.unidad ? ' ' + mp.unidad : '';
            const stockMP = mp ? (mp.stock || 0) : 0;
            const necesario = f.cantidad * cantidad;
            const ok = stockMP >= necesario;
            return `
                <div class="summary-item" style="font-size:0.8125rem;">
                    <span>${this.escapeHtml(nombreMP)} (${f.codigoMP})</span>
                    <span>
                        Necesita: <strong>${necesario}${unidadMP}</strong> &middot;
                        Stock: <strong style="color:${ok ? '#1f6f4f' : '#9b2c2c'}">${stockMP}${unidadMP}</strong>
                    </span>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <p style="font-size:0.8125rem;color:#6b7280;margin-bottom:0.5rem;">
                Para producir <strong>${cantidad}</strong> unidad(es) de <strong>${this.escapeHtml(prod.nombre)}</strong>:
            </p>
            ${filas}
        `;
        preview.style.display = 'block';
    }

    async ejecutarProduccion() {
        const select = this.querySelector('#prod-producto');
        const cantInput = this.querySelector('#prod-cantidad');
        const errorDiv = this.querySelector('#prod-error');
        const btnSubmit = this.querySelector('#prod-submit');

        const productoKey = select.value;
        const cantidad = parseInt(cantInput.value);

        // Reset error
        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';

        if (!productoKey || !cantidad || cantidad < 1) {
            errorDiv.textContent = 'Seleccione un producto y una cantidad valida';
            errorDiv.classList.remove('hidden');
            return;
        }

        const producto = this.inventarioCompleto.find(p => p._firebaseKey === productoKey);
        if (!producto) {
            errorDiv.textContent = 'Producto no encontrado';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (!producto.formula || producto.formula.length === 0) {
            errorDiv.textContent = 'Este producto no tiene formula definida';
            errorDiv.classList.remove('hidden');
            return;
        }

        console.log(`[Production] Solicitud: ${cantidad} x ${producto.codigo}`);

        // ============================================================
        // PASO 1: VALIDAR STOCK DE CADA INGREDIENTE
        // ============================================================
        const faltantes = [];
        for (const ingrediente of producto.formula) {
            const mp = this.inventarioCompleto.find(p => p.codigo === ingrediente.codigoMP);
            if (!mp) {
                faltantes.push(`Materia prima "${ingrediente.codigoMP}" no existe en inventario`);
                continue;
            }
            const stockActual = parseFloat(mp.stock) || 0;
            const requerido = ingrediente.cantidad * cantidad;
            if (stockActual < requerido) {
                faltantes.push(`${mp.nombre}: necesita ${requerido}, solo hay ${stockActual}`);
            }
        }

        if (faltantes.length > 0) {
            console.warn('[Production] Stock insuficiente:', faltantes);
            errorDiv.innerHTML = '<strong>Stock insuficiente:</strong><br>' + faltantes.map(f => `&bull; ${this.escapeHtml(f)}`).join('<br>');
            errorDiv.classList.remove('hidden');
            this.mostrarToast('Stock insuficiente para producir', 'error');
            return;
        }

        setBotonCargando(btnSubmit, true);

        // ============================================================
        // PASO 2 & 3: RESTAR MP Y SUMAR PT
        // ============================================================
        console.log('[Production] Stock validado. Ejecutando transformacion...');

        const inventarioActualizado = [...this.inventarioCompleto];
        const materiaConsumida = [];

        for (const ingrediente of producto.formula) {
            const idx = inventarioActualizado.findIndex(p => p.codigo === ingrediente.codigoMP);
            if (idx !== -1) {
                const mp = inventarioActualizado[idx];
                const consumo = ingrediente.cantidad * cantidad;
                const nuevoStock = (parseFloat(mp.stock) || 0) - consumo;
                inventarioActualizado[idx] = {
                    ...mp,
                    stock: nuevoStock
                };
                materiaConsumida.push({
                    codigo: mp.codigo,
                    nombre: mp.nombre,
                    cantidad: consumo,
                    stockAnterior: mp.stock || 0,
                    stockNuevo: nuevoStock
                });
                console.log(`[Production] MP ${mp.codigo}: ${mp.stock || 0} -> ${nuevoStock} (consumio ${consumio})`);
            }
        }

        // Sumar producto terminado
        const idxPT = inventarioActualizado.findIndex(p => p._firebaseKey === productoKey);
        if (idxPT !== -1) {
            const pt = inventarioActualizado[idxPT];
            const stockAnterior = parseFloat(pt.stock) || 0;
            const nuevoStockPT = stockAnterior + cantidad;
            inventarioActualizado[idxPT] = {
                ...pt,
                stock: nuevoStockPT
            };
            console.log(`[Production] PT ${pt.codigo}: ${stockAnterior} -> ${nuevoStockPT} (produjo ${cantidad})`);
        }

        // ============================================================
        // PASO 4: GENERAR CONSECUTIVO
        // ============================================================
        const consecutivo = await dataManager.obtenerSiguienteConsecutivo();
        console.log('[Production] Consecutivo generado:', consecutivo);

        // ============================================================
        // PASO 5: GUARDAR REGISTRO HISTORICO Y ACTUALIZAR INVENTARIO
        // ============================================================
        const registroProduccion = {
            codigo: consecutivo.toString(),
            productoKey: productoKey,
            codigoProducto: producto.codigo,
            nombreProducto: producto.nombre,
            cantidadProducida: cantidad,
            materiaPrimaConsumida: materiaConsumida,
            usuarioNombre: (obtenerUsuarioSesion() || {}).nombreCompleto || 'Desconocido',
            fecha: new Date().toISOString(),
            timestamp: Date.now()
        };

        try {
            const resultado = await dataManager.ejecutarProduccion({
                inventarioActualizado,
                registroProduccion
            });

            console.log('[Production] Produccion completada:', resultado);

            // Mostrar resumen
            this.mostrarResumen({
                consecutivo,
                producto: producto.nombre,
                codigo: producto.codigo,
                cantidad,
                materiaConsumida
            });

            this.mostrarToast(`Produccion #${consecutivo} completada: ${cantidad} x ${producto.nombre}`, 'success');

            // Reset form
            select.value = '';
            cantInput.value = '1';
            this.querySelector('#formula-preview').style.display = 'none';

            // Recargar datos
            await this.cargarDatos();

        } catch (err) {
            console.error('[Production] Error ejecutando produccion:', err);
            errorDiv.textContent = 'Error al ejecutar la produccion. Intente de nuevo.';
            errorDiv.classList.remove('hidden');
            this.mostrarToast('Error en la produccion', 'error');
        } finally {
            setBotonCargando(btnSubmit, false);
        }
    }

    mostrarResumen({ consecutivo, producto, codigo, cantidad, materiaConsumida }) {
        const container = this.querySelector('#resumen-container');
        const content = this.querySelector('#resumen-content');
        if (!container || !content) return;

        const fecha = new Date().toLocaleString('es-CO');

        content.innerHTML = `
            <div class="summary-item">
                <span>Código de Producción</span>
                <span><strong>#${consecutivo}</strong></span>
            </div>
            <div class="summary-item">
                <span>Producto Fabricado</span>
                <span><strong>${this.escapeHtml(producto)}</strong> (${this.escapeHtml(codigo)})</span>
            </div>
            <div class="summary-item">
                <span>Cantidad Producida</span>
                <span><strong>${cantidad}</strong> unidad(es)</span>
            </div>
            <div class="summary-item">
                <span>Materia Prima Consumida</span>
                <span></span>
            </div>
            ${materiaConsumida.map(mc => `
                <div class="summary-item" style="padding-left:1rem;font-size:0.8125rem;">
                    <span>&bull; ${this.escapeHtml(mc.nombre)} (${this.escapeHtml(mc.codigo)})</span>
                    <span><strong>${mc.cantidad}</strong> unidades</span>
                </div>
            `).join('')}
            <div class="summary-item" style="margin-top:0.5rem;border-top:2px solid #bcd9c9;padding-top:0.75rem;">
                <span>Fecha y Hora</span>
                <span>${fecha}</span>
            </div>
        `;

        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    renderHistorial(lista) {
        const tbody = this.querySelector('#prod-tbody');
        const pagContainer = this.querySelector('#prod-pagination');
        if (!tbody) return;

        if (lista.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" class="empty-state">
                    <p>No hay registros de producción</p>
                </td></tr>
            `;
            if (pagContainer) pagContainer.innerHTML = '';
            return;
        }

        const { items, paginaActual, totalPaginas, total } = paginar(lista, this.paginaActual, POR_PAGINA);
        this.paginaActual = paginaActual;

        if (pagContainer) {
            renderPaginacion(pagContainer, { paginaActual, totalPaginas, total, porPagina: POR_PAGINA }, (nuevaPagina) => {
                this.paginaActual = nuevaPagina;
                this.renderHistorial(lista);
            });
        }

        tbody.innerHTML = items.map(r => {
            const fecha = r.fecha ? new Date(r.fecha).toLocaleString('es-CO') : '-';
            const mpResumen = r.materiaPrimaConsumida
                ? r.materiaPrimaConsumida.map(mc => `${mc.nombre}: ${mc.cantidad}`).join(', ')
                : '-';

            return `
                <tr>
                    <td><strong>#${this.escapeHtml(r.codigo || '-')}</strong></td>
                    <td>${this.escapeHtml(r.nombreProducto || '-')} (${this.escapeHtml(r.codigoProducto || '-')})</td>
                    <td style="text-align:right;font-weight:600">${r.cantidadProducida || 0}</td>
                    <td style="font-size:0.8125rem;color:#5b6577">${this.escapeHtml(mpResumen)}</td>
                    <td style="font-size:0.8125rem;color:#5b6577">${this.escapeHtml(r.usuarioNombre || '-')}</td>
                    <td style="font-size:0.8125rem;white-space:nowrap">${fecha}</td>
                </tr>
            `;
        }).join('');
    }

    filtrarHistorial(query) {
        const q = query.toLowerCase().trim();
        this.historialFiltrado = !q ? this.historialCompleto : this.historialCompleto.filter(r => {
            const texto = `${r.codigo || ''} ${r.nombreProducto || ''} ${r.codigoProducto || ''} ${r.usuarioNombre || ''}`.toLowerCase();
            return texto.includes(q);
        });
        this.paginaActual = 1;
        this.renderHistorial(this.historialFiltrado);
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

customElements.define('acme-production', AcmeProduction);
