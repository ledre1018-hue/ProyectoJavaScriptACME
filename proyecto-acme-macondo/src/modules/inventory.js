/**
 * inventory.js
 * Modulo de Inventario / Bodega
 * Logica operativa de gestion de inventario independiente de la UI
 */

import { dataManager } from '../data/dataManager.js';

console.log('[Inventory] Modulo de inventario cargado');

/**
 * Obtiene todos los productos del inventario
 * @returns {Promise<Array>}
 */
export async function listarInventario() {
    return await dataManager.obtenerInventario();
}

/**
 * Obtiene solo las materias primas
 * @returns {Promise<Array>}
 */
export async function listarMateriasPrimas() {
    const inv = await dataManager.obtenerInventario();
    return inv.filter(p => p.tipo === 'materia_prima');
}

/**
 * Obtiene solo los productos terminados
 * @returns {Promise<Array>}
 */
export async function listarProductosTerminados() {
    const inv = await dataManager.obtenerInventario();
    return inv.filter(p => p.tipo === 'producto_terminado');
}

/**
 * Ingresa materia prima al inventario (aumenta stock)
 * @param {string} productoKey - Firebase key del producto
 * @param {number} cantidad - Cantidad a ingresar
 * @returns {Promise<Object>} - { ok, nuevoStock }
 */
export async function ingresarMateriaPrima(productoKey, cantidad) {
    console.log(`[Inventory] Ingresando ${cantidad} unidades a ${productoKey}`);
    const productos = await dataManager.obtenerInventario();
    const producto = productos.find(p => p._firebaseKey === productoKey);
    if (!producto) throw new Error('Producto no encontrado');

    const nuevoStock = (parseInt(producto.stock) || 0) + cantidad;
    await dataManager.actualizarProducto(productoKey, { stock: nuevoStock });

    console.log(`[Inventory] Stock actualizado: ${producto.codigo} = ${nuevoStock}`);
    return { ok: true, nuevoStock, producto };
}

/**
 * Valida una formula para un producto terminado
 * @param {Array} formula - Array de { codigoMP, cantidad }
 * @param {Array} inventario - Inventario completo
 * @returns {Object} - { valida: boolean, errores: string[] }
 */
export function validarFormula(formula, inventario) {
    const errores = [];
    if (!formula || formula.length === 0) {
        errores.push('La formula debe tener al menos un ingrediente');
        return { valida: false, errores };
    }

    formula.forEach((ing, i) => {
        if (!ing.codigoMP) errores.push(`Ingrediente ${i + 1}: seleccione una materia prima`);
        if (!ing.cantidad || ing.cantidad <= 0) errores.push(`Ingrediente ${i + 1}: la cantidad debe ser mayor a 0`);

        const mp = inventario.find(p => p.codigo === ing.codigoMP);
        if (ing.codigoMP && !mp) errores.push(`Ingrediente ${i + 1}: materia prima "${ing.codigoMP}" no existe`);
    });

    return { valida: errores.length === 0, errores };
}

/**
 * Busca productos en el inventario
 * @param {Array} productos - Lista de productos
 * @param {string} query - Texto de busqueda
 * @returns {Array}
 */
export function buscarProductos(productos, query) {
    const q = query.toLowerCase().trim();
    if (!q) return productos;
    return productos.filter(p =>
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.proveedor || '').toLowerCase().includes(q)
    );
}
