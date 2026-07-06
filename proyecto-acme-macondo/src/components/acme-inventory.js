/**
 * acme-inventory.js
 * Web Component: Gestion de Inventario Completo
 * - Crear productos (materia prima o producto terminado)
 - Definir formula/receta para productos terminados
 * - Listar con buscador en tiempo real
 * - Ingresar materia prima (aumentar stock)
 * - Ver stock actual
 */

import { dataManager } from '../data/dataManager.js';
import { paginar, renderPaginacion, debounce, setBotonCargando, exportarCSV, obtenerUsuarioSesion } from '../utils/ui.js';

const POR_PAGINA = 10;
const UNIDADES = ['g', 'kg', 'ml', 'l', 'unidad', 'lb'];

class AcmeInventory extends HTMLElement {
    constructor() {
        super();
        this.productos = [];
        this.productosFiltrados = [];
        this.materiasPrimas = []; // cache de MP para formulas
        this.editandoKey = null;
        this.mostrarFormula = false;
        this.paginaActual = 1;
        this.verificarCodigoDebounced = debounce(() => this.verificarCodigoUnico(), 300);
    }

    connectedCallback() {
        this.render();
        this.cargarDatos();
    }

    render() {
        this.innerHTML = `
            <div class="page-header">
                <h2>Inventario / Bodega</h2>
                <p>Gestión de materia prima y productos terminados</p>
            </div>

            <!-- FORMULARIO -->
            <div class="card mb-3">
                <div class="card-header">
                    <h3>${this.editandoKey ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                </div>
                <div class="card-body">
                    <form id="inv-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Código *</label>
                                <input type="text" id="inv-codigo" placeholder="Ej: MP-001" required 
                                    ${this.editandoKey ? 'disabled' : ''}>
                                <div class="error-msg hidden" id="inv-codigo-error"></div>
                            </div>
                            <div class="form-group">
                                <label>Nombre *</label>
                                <input type="text" id="inv-nombre" placeholder="Nombre del producto" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Proveedor</label>
                                <input type="text" id="inv-proveedor" placeholder="Nombre del proveedor">
                            </div>
                            <div class="form-group">
                                <label>Tipo *</label>
                                <select id="inv-tipo" required>
                                    <option value="">Seleccione tipo...</option>
                                    <option value="materia_prima">Materia Prima</option>
                                    <option value="producto_terminado">Producto Terminado</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Stock Inicial</label>
                                <input type="number" id="inv-stock" placeholder="0" value="0" min="0" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Unidad de Medida</label>
                                <select id="inv-unidad">
                                    ${UNIDADES.map(u => `<option value="${u}">${u}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Stock Mínimo (alerta)</label>
                                <input type="number" id="inv-stock-minimo" placeholder="Opcional" min="0" step="0.01">
                                <small class="help-text">Se avisará en el panel general cuando el stock caiga a este nivel o menos.</small>
                            </div>
                        </div>

                        <!-- SECCION FORMULA (solo producto terminado) -->
                        <div id="formula-section" style="display:none;margin-top:1rem;padding-top:1rem;border-top:1px dashed #e1ddd3;">
                            <h4 style="font-size:0.875rem;color:#1b2430;margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.03em;">Fórmula / Receta</h4>
                            <p style="font-size:0.8125rem;color:#5b6577;margin-bottom:0.75rem;">
                                Seleccione las materias primas y cantidades necesarias para producir <strong>1 unidad</strong> de este producto.
                            </p>
                            <div id="formula-rows"></div>
                            <button type="button" class="btn btn-sm btn-outline" id="add-formula-row" style="margin-top:0.5rem">
                                Agregar Ingrediente
                            </button>
                            <div class="error-msg hidden" id="formula-error"></div>
                        </div>

                        <div class="btn-group mt-2">
                            <button type="submit" class="btn btn-primary" id="inv-submit">
                                ${this.editandoKey ? 'Guardar Cambios' : 'Crear Producto'}
                            </button>
                            ${this.editandoKey ? `
                                <button type="button" class="btn btn-outline" id="inv-cancel">Cancelar</button>
                            ` : ''}
                        </div>
                    </form>
                </div>
            </div>

            <!-- INGRESO DE MATERIA PRIMA -->
            <div class="card mb-3">
                <div class="card-header">
                    <h3>Ingresar al Inventario</h3>
                </div>
                <div class="card-body">
                    <form id="ingreso-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Producto (Código o Nombre)</label>
                                <select id="ingreso-producto" required>
                                    <option value="">Seleccione un producto...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Cantidad a Ingresar *</label>
                                <input type="number" id="ingreso-cantidad" placeholder="Cantidad" required min="0.01" step="0.01" value="1">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-secondary" id="ingreso-submit">Ingresar al Inventario</button>
                    </form>
                </div>
            </div>

            <!-- REGISTRO DE MERMA -->
            <div class="card mb-3">
                <div class="card-header">
                    <h3>Registrar Merma o Pérdida</h3>
                </div>
                <div class="card-body">
                    <form id="merma-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Producto Afectado</label>
                                <select id="merma-producto" required>
                                    <option value="">Seleccione un producto...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Cantidad Perdida *</label>
                                <input type="number" id="merma-cantidad" placeholder="Cantidad" required min="0.01" step="0.01">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Motivo *</label>
                            <input type="text" id="merma-motivo" placeholder="Ej: producto vencido, caída, derrame..." required>
                        </div>
                        <button type="submit" class="btn btn-outline" id="merma-submit" style="border-color:#9b2c2c;color:#9b2c2c">Registrar Merma</button>
                    </form>
                </div>
            </div>

            <!-- LISTA DE PRODUCTOS -->
            <div class="card">
                <div class="card-header">
                    <h3>Lista de Productos</h3>
                    <div class="d-flex gap-2 items-center flex-wrap">
                        <div class="search-bar">
                            <input type="text" id="inv-search" placeholder="Buscar por código, nombre o proveedor...">
                        </div>
                        <button type="button" class="btn btn-outline btn-sm" id="inv-export">Exportar CSV</button>
                    </div>
                </div>
                <div class="card-body" style="padding:0">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nombre</th>
                                    <th>Proveedor</th>
                                    <th>Tipo</th>
                                    <th style="text-align:right">Stock</th>
                                    <th style="text-align:center;width:170px">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="inv-tbody">
                                <tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:2rem">Cargando inventario...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="pagination" id="inv-pagination"></div>
                </div>
            </div>
        `;
        this.setupListeners();
        this.actualizarSelectIngreso();
        this.actualizarSelectMerma();
        this.actualizarFormulaRows();
    }

    setupListeners() {
        // Formulario de producto
        const form = this.querySelector('#inv-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarProducto();
            });
        }

        // Cancelar edicion
        const cancel = this.querySelector('#inv-cancel');
        if (cancel) {
            cancel.addEventListener('click', () => {
                this.editandoKey = null;
                this.render();
                this.cargarDatos();
            });
        }

        // Tipo: mostrar/ocultar formula
        const tipoSelect = this.querySelector('#inv-tipo');
        if (tipoSelect) {
            tipoSelect.addEventListener('change', () => {
                this.toggleFormula(tipoSelect.value === 'producto_terminado');
            });
        }

        // Agregar fila de formula
        const addRow = this.querySelector('#add-formula-row');
        if (addRow) {
            addRow.addEventListener('click', () => this.addFormulaRow());
        }

        // Busqueda
        const search = this.querySelector('#inv-search');
        if (search) {
            search.addEventListener('input', (e) => {
                this.filtrarProductos(e.target.value);
            });
        }

        // Formulario de ingreso
        const ingresoForm = this.querySelector('#ingreso-form');
        if (ingresoForm) {
            ingresoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.ingresarMateriaPrima();
            });
        }

        // Formulario de merma
        const mermaForm = this.querySelector('#merma-form');
        if (mermaForm) {
            mermaForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registrarMerma();
            });
        }

        // Verificacion de codigo unico en tiempo real (con debounce)
        const codigoInput = this.querySelector('#inv-codigo');
        if (codigoInput && !this.editandoKey) {
            codigoInput.addEventListener('input', () => this.verificarCodigoDebounced());
        }

        // Exportar CSV
        const exportBtn = this.querySelector('#inv-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportarInventario());
        }
    }

    verificarCodigoUnico() {
        const codigoInput = this.querySelector('#inv-codigo');
        const errorDiv = this.querySelector('#inv-codigo-error');
        if (!codigoInput || !errorDiv) return;

        const codigo = codigoInput.value.trim().toUpperCase();
        if (!codigo) {
            errorDiv.classList.add('hidden');
            codigoInput.classList.remove('error');
            return;
        }

        const existe = this.productos.some(p => p.codigo === codigo);
        if (existe) {
            errorDiv.textContent = 'Ya existe un producto con este código';
            errorDiv.classList.remove('hidden');
            codigoInput.classList.add('error');
        } else {
            errorDiv.classList.add('hidden');
            codigoInput.classList.remove('error');
        }
    }

    toggleFormula(mostrar) {
        const section = this.querySelector('#formula-section');
        if (section) {
            section.style.display = mostrar ? 'block' : 'none';
        }
    }

    addFormulaRow(selectedMp = '', cantidad = '') {
        const container = this.querySelector('#formula-rows');
        if (!container) return;

        const mpInicial = this.materiasPrimas.find(mp => mp.codigo === selectedMp);

        const row = document.createElement('div');
        row.className = 'formula-row';
        row.innerHTML = `
            <div class="form-group" style="margin-bottom:0">
                <select class="formula-mp" required>
                    <option value="">Seleccione materia prima...</option>
                    ${this.materiasPrimas.map(mp => `
                        <option value="${mp.codigo}" ${mp.codigo === selectedMp ? 'selected' : ''}>
                            ${mp.codigo} - ${mp.nombre} (Stock: ${mp.stock || 0}${mp.unidad ? ' ' + mp.unidad : ''})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
                <input type="number" class="formula-cantidad" placeholder="Cantidad" required min="0.01" step="0.01" value="${cantidad}">
            </div>
            <div class="form-group" style="margin-bottom:0">
                <input type="text" class="formula-unidad" placeholder="Unidad" value="${mpInicial ? mpInicial.unidad || '' : ''}" disabled>
            </div>
            <button type="button" class="btn btn-danger btn-sm btn-remove-formula" title="Eliminar">&times;</button>
        `;

        const selectMp = row.querySelector('.formula-mp');
        const unidadInput = row.querySelector('.formula-unidad');
        selectMp.addEventListener('change', () => {
            const mp = this.materiasPrimas.find(m => m.codigo === selectMp.value);
            unidadInput.value = mp ? (mp.unidad || '') : '';
        });

        row.querySelector('.btn-remove-formula').addEventListener('click', () => {
            row.remove();
        });

        container.appendChild(row);
    }

    actualizarFormulaRows() {
        const container = this.querySelector('#formula-rows');
        if (!container) return;
        container.innerHTML = '';

        // Si estamos editando y tiene formula, cargarla
        if (this.editandoKey) {
            const prod = this.productos.find(p => p._firebaseKey === this.editandoKey);
            if (prod && prod.formula && prod.formula.length > 0) {
                prod.formula.forEach(f => this.addFormulaRow(f.codigoMP, f.cantidad));
                this.toggleFormula(true);
            }
        } else {
            // Por defecto, 1 fila vacia
            if (this.materiasPrimas.length > 0) {
                this.addFormulaRow();
            }
        }
    }

    actualizarSelectIngreso() {
        const select = this.querySelector('#ingreso-producto');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccione un producto...</option>' +
            this.productos.map(p => `
                <option value="${p._firebaseKey}">${p.codigo} - ${p.nombre} (Stock: ${p.stock || 0}${p.unidad ? ' ' + p.unidad : ''})</option>
            `).join('');
    }

    actualizarSelectMerma() {
        const select = this.querySelector('#merma-producto');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccione un producto...</option>' +
            this.productos.map(p => `
                <option value="${p._firebaseKey}">${p.codigo} - ${p.nombre} (Stock: ${p.stock || 0}${p.unidad ? ' ' + p.unidad : ''})</option>
            `).join('');
    }

    exportarInventario() {
        const headers = ['Codigo', 'Nombre', 'Proveedor', 'Tipo', 'Stock', 'Unidad', 'Stock Minimo'];
        const rows = this.productosFiltrados.map(p => [
            p.codigo || '', p.nombre || '', p.proveedor || '',
            p.tipo === 'materia_prima' ? 'Materia Prima' : 'Producto Terminado',
            p.stock ?? 0, p.unidad || '', p.stockMinimo ?? ''
        ]);
        exportarCSV('inventario_acme.csv', headers, rows);
    }

    async cargarDatos() {
        try {
            console.log('[Inventory] Cargando datos...');
            this.productos = await dataManager.obtenerInventario();
            this.productosFiltrados = this.productos;
            console.log('[Inventory]', this.productos.length, 'productos cargados');

            // Filtrar materias primas para las formulas
            this.materiasPrimas = this.productos.filter(p => p.tipo === 'materia_prima');
            console.log('[Inventory]', this.materiasPrimas.length, 'materias primas disponibles');

            this.paginaActual = 1;
            this.renderTabla(this.productosFiltrados);
            this.actualizarSelectIngreso();
            this.actualizarSelectMerma();
        } catch (err) {
            console.error('[Inventory] Error cargando datos:', err);
            this.mostrarToast('Error al cargar inventario', 'error');
        }
    }

    renderTabla(lista) {
        const tbody = this.querySelector('#inv-tbody');
        const pagContainer = this.querySelector('#inv-pagination');
        if (!tbody) return;

        if (lista.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" class="empty-state">
                    <p>No hay productos en el inventario</p>
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
                this.renderTabla(lista);
            });
        }

        tbody.innerHTML = items.map(p => {
            const tipoLabel = p.tipo === 'materia_prima'
                ? '<span class="badge badge-mp">Materia Prima</span>'
                : '<span class="badge badge-pt">Producto Terminado</span>';
            const formulaInfo = p.formula && p.formula.length > 0
                ? `<br><small style="color:#5b6577">${p.formula.length} ingrediente(s)</small>`
                : '';

            const minimo = parseFloat(p.stockMinimo);
            const stockActual = parseFloat(p.stock) || 0;
            const stockBajo = minimo > 0 && stockActual <= minimo;
            const stockLabel = `${p.stock || 0}${p.unidad ? ' ' + this.escapeHtml(p.unidad) : ''}`;

            return `
                <tr data-key="${p._firebaseKey || ''}" class="${stockBajo ? 'row-warning' : ''}">
                    <td><strong>${this.escapeHtml(p.codigo)}</strong></td>
                    <td>
                        ${this.escapeHtml(p.nombre)}
                        ${formulaInfo}
                    </td>
                    <td>${this.escapeHtml(p.proveedor || '-')}</td>
                    <td>${tipoLabel}</td>
                    <td style="text-align:right;font-weight:600">
                        ${stockLabel}
                        ${stockBajo ? '<br><span class="badge badge-warning">Stock bajo</span>' : ''}
                    </td>
                    <td style="text-align:center">
                        <div class="btn-group" style="justify-content:center">
                            <button class="btn btn-sm btn-primary btn-edit" data-key="${p._firebaseKey}" title="Editar">Editar</button>
                            <button class="btn btn-sm btn-danger btn-delete" data-key="${p._firebaseKey}" title="Eliminar">Eliminar</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.iniciarEdicion(btn.dataset.key));
        });
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.confirmarEliminar(btn.dataset.key));
        });
    }

    filtrarProductos(query) {
        const q = query.toLowerCase().trim();
        this.productosFiltrados = !q ? this.productos : this.productos.filter(p =>
            (p.codigo || '').toLowerCase().includes(q) ||
            (p.nombre || '').toLowerCase().includes(q) ||
            (p.proveedor || '').toLowerCase().includes(q)
        );
        this.paginaActual = 1;
        this.renderTabla(this.productosFiltrados);
    }

    async guardarProducto() {
        const codigo = this.querySelector('#inv-codigo').value.trim().toUpperCase();
        const nombre = this.querySelector('#inv-nombre').value.trim();
        const proveedor = this.querySelector('#inv-proveedor').value.trim();
        const tipo = this.querySelector('#inv-tipo').value;
        const stock = parseFloat(this.querySelector('#inv-stock').value) || 0;
        const unidad = this.querySelector('#inv-unidad').value;
        const stockMinimoRaw = this.querySelector('#inv-stock-minimo').value;
        const stockMinimo = stockMinimoRaw !== '' ? parseFloat(stockMinimoRaw) : null;
        const btnSubmit = this.querySelector('#inv-submit');

        if (!codigo || !nombre || !tipo) {
            this.mostrarToast('Codigo, nombre y tipo son obligatorios', 'error');
            return;
        }

        // Recolectar formula si es producto terminado
        let formula = null;
        if (tipo === 'producto_terminado') {
            formula = [];
            const rows = this.querySelectorAll('#formula-rows .formula-row');
            rows.forEach(row => {
                const mp = row.querySelector('.formula-mp').value;
                const cant = parseFloat(row.querySelector('.formula-cantidad').value);
                if (mp && cant > 0) {
                    formula.push({ codigoMP: mp, cantidad: cant });
                }
            });

            if (formula.length === 0) {
                this.mostrarToast('Un producto terminado debe tener al menos un ingrediente en su formula', 'error');
                return;
            }
        }

        setBotonCargando(btnSubmit, true);
        try {
            if (this.editandoKey) {
                // Actualizar
                const datos = { nombre, proveedor, tipo, unidad, stockMinimo };
                if (formula) datos.formula = formula;

                await dataManager.actualizarProducto(this.editandoKey, datos);
                console.log('[Inventory] Producto actualizado:', this.editandoKey);
                this.mostrarToast('Producto actualizado correctamente', 'success');
                this.editandoKey = null;
            } else {
                // Crear: verificar codigo unico
                const existe = this.productos.some(p => p.codigo === codigo);
                if (existe) {
                    this.mostrarToast('Ya existe un producto con ese codigo', 'error');
                    return;
                }

                const producto = {
                    codigo,
                    nombre,
                    proveedor,
                    tipo,
                    stock,
                    unidad,
                    fechaCreacion: new Date().toISOString()
                };
                if (stockMinimo !== null) producto.stockMinimo = stockMinimo;
                if (formula) producto.formula = formula;

                await dataManager.crearProducto(producto);
                console.log('[Inventory] Producto creado:', codigo);
                this.mostrarToast('Producto creado correctamente', 'success');
            }

            this.render();
            await this.cargarDatos();

        } catch (err) {
            console.error('[Inventory] Error guardando producto:', err);
            this.mostrarToast('Error al guardar producto', 'error');
        } finally {
            setBotonCargando(btnSubmit, false);
        }
    }

    async ingresarMateriaPrima() {
        const select = this.querySelector('#ingreso-producto');
        const cantInput = this.querySelector('#ingreso-cantidad');
        const btnSubmit = this.querySelector('#ingreso-submit');
        const key = select.value;
        const cantidad = parseFloat(cantInput.value);

        if (!key) {
            this.mostrarToast('Seleccione un producto', 'error');
            return;
        }
        if (!cantidad || cantidad <= 0) {
            this.mostrarToast('Ingrese una cantidad valida (mayor a 0)', 'error');
            return;
        }

        setBotonCargando(btnSubmit, true);
        try {
            const producto = this.productos.find(p => p._firebaseKey === key);
            if (!producto) {
                this.mostrarToast('Producto no encontrado', 'error');
                return;
            }

            const nuevoStock = (parseFloat(producto.stock) || 0) + cantidad;
            await dataManager.actualizarProducto(key, { stock: nuevoStock });

            console.log(`[Inventory] Stock actualizado: ${producto.codigo} = ${nuevoStock} (+${cantidad})`);
            this.mostrarToast(`Ingreso registrado: ${producto.nombre} - Stock actual: ${nuevoStock}${producto.unidad ? ' ' + producto.unidad : ''}`, 'success');

            // Reset form
            select.value = '';
            cantInput.value = '1';

            // Recargar
            await this.cargarDatos();

        } catch (err) {
            console.error('[Inventory] Error en ingreso:', err);
            this.mostrarToast('Error al ingresar materia prima', 'error');
        } finally {
            setBotonCargando(btnSubmit, false);
        }
    }

    async registrarMerma() {
        const select = this.querySelector('#merma-producto');
        const cantInput = this.querySelector('#merma-cantidad');
        const motivoInput = this.querySelector('#merma-motivo');
        const btnSubmit = this.querySelector('#merma-submit');

        const key = select.value;
        const cantidad = parseFloat(cantInput.value);
        const motivo = motivoInput.value.trim();

        if (!key) {
            this.mostrarToast('Seleccione un producto', 'error');
            return;
        }
        if (!cantidad || cantidad <= 0) {
            this.mostrarToast('Ingrese una cantidad valida (mayor a 0)', 'error');
            return;
        }
        if (!motivo) {
            this.mostrarToast('Indique el motivo de la merma', 'error');
            return;
        }

        const producto = this.productos.find(p => p._firebaseKey === key);
        if (!producto) {
            this.mostrarToast('Producto no encontrado', 'error');
            return;
        }

        const stockActual = parseFloat(producto.stock) || 0;
        if (cantidad > stockActual) {
            this.mostrarToast(`No hay suficiente stock: disponible ${stockActual}${producto.unidad ? ' ' + producto.unidad : ''}`, 'error');
            return;
        }

        setBotonCargando(btnSubmit, true);
        try {
            const nuevoStock = stockActual - cantidad;
            const inventarioActualizado = this.productos.map(p =>
                p._firebaseKey === key ? { ...p, stock: nuevoStock } : { ...p }
            );

            const usuario = obtenerUsuarioSesion();
            const registroMerma = {
                codigoProducto: producto.codigo,
                nombreProducto: producto.nombre,
                cantidad,
                unidad: producto.unidad || '',
                motivo,
                stockAnterior: stockActual,
                stockNuevo: nuevoStock,
                usuario: usuario ? usuario.nombreCompleto : 'Desconocido',
                fecha: new Date().toISOString()
            };

            await dataManager.ejecutarMerma({ inventarioActualizado, registroMerma });

            console.log('[Inventory] Merma registrada:', registroMerma);
            this.mostrarToast(`Merma registrada: ${producto.nombre} (-${cantidad}${producto.unidad ? ' ' + producto.unidad : ''})`, 'warning');

            select.value = '';
            cantInput.value = '';
            motivoInput.value = '';

            await this.cargarDatos();

        } catch (err) {
            console.error('[Inventory] Error registrando merma:', err);
            this.mostrarToast('Error al registrar la merma', 'error');
        } finally {
            setBotonCargando(btnSubmit, false);
        }
    }

    iniciarEdicion(key) {
        const prod = this.productos.find(p => p._firebaseKey === key);
        if (!prod) return;

        this.editandoKey = key;
        this.render();

        this.querySelector('#inv-codigo').value = prod.codigo;
        this.querySelector('#inv-nombre').value = prod.nombre;
        this.querySelector('#inv-proveedor').value = prod.proveedor || '';
        this.querySelector('#inv-tipo').value = prod.tipo;
        this.querySelector('#inv-stock').value = prod.stock || 0;
        this.querySelector('#inv-unidad').value = prod.unidad || 'unidad';
        this.querySelector('#inv-stock-minimo').value = prod.stockMinimo ?? '';

        // Trigger change para mostrar formula si es PT
        this.toggleFormula(prod.tipo === 'producto_terminado');
    }

    confirmarEliminar(key) {
        const prod = this.productos.find(p => p._firebaseKey === key);
        if (!prod) return;

        if (confirm(`¿Eliminar el producto "${prod.nombre}" (${prod.codigo})?\n\nEsta accion no se puede deshacer.`)) {
            this.eliminarProducto(key);
        }
    }

    async eliminarProducto(key) {
        try {
            await dataManager.eliminarProducto(key);
            console.log('[Inventory] Producto eliminado:', key);
            this.mostrarToast('Producto eliminado correctamente', 'success');
            await this.cargarDatos();
        } catch (err) {
            console.error('[Inventory] Error eliminando producto:', err);
            this.mostrarToast('Error al eliminar producto', 'error');
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

customElements.define('acme-inventory', AcmeInventory);
