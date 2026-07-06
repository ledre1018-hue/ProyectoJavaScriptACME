/**
 * production.js
 * Modulo de Produccion (Motor de Transformacion)
 * Logica operativa de produccion independiente de la UI
 * Algoritmo: Validar stock -> Restar MP -> Sumar PT -> Generar consecutivo -> Guardar
 */

import { dataManager } from '../data/dataManager.js';

console.log('[Production] Modulo de produccion cargado');

/**
 * Valida si hay suficiente materia prima para una produccion
 * @param {Object} producto - Producto terminado con formula
 * @param {number} cantidad - Cantidad a producir
 * @param {Array} inventario - Inventario completo
 * @returns {Object} - { puedeProducir: boolean, faltantes: Array }
 */
export function validarStockProduccion(producto, cantidad, inventario) {
    const faltantes = [];

    if (!producto.formula || producto.formula.length === 0) {
        faltantes.push('El producto no tiene formula definida');
        return { puedeProducir: false, faltantes };
    }

    for (const ingrediente of producto.formula) {
        const mp = inventario.find(p => p.codigo === ingrediente.codigoMP);
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

    return {
        puedeProducir: faltantes.length === 0,
        faltantes
    };
}

/**
 * Calcula el inventario resultante despues de una produccion
 * (sin guardar en Firebase, solo calcula)
 * @param {Object} producto - Producto a fabricar
 * @param {number} cantidad - Cantidad
 * @param {Array} inventario - Inventario actual
 * @returns {Object} - { inventarioActualizado, materiaConsumida, stockAnteriorPT, stockNuevoPT }
 */
export function calcularProduccion(producto, cantidad, inventario) {
    const inventarioActualizado = inventario.map(p => ({ ...p }));
    const materiaConsumida = [];

    // Restar materias primas
    for (const ingrediente of producto.formula) {
        const idx = inventarioActualizado.findIndex(p => p.codigo === ingrediente.codigoMP);
        if (idx !== -1) {
            const mp = inventarioActualizado[idx];
            const consumo = ingrediente.cantidad * cantidad;
            const stockAnterior = parseFloat(mp.stock) || 0;
            const nuevoStock = stockAnterior - consumo;
            inventarioActualizado[idx] = { ...mp, stock: nuevoStock };
            materiaConsumida.push({
                codigo: mp.codigo,
                nombre: mp.nombre,
                cantidad: consumo,
                stockAnterior,
                stockNuevo: nuevoStock
            });
        }
    }

    // Sumar producto terminado
    const idxPT = inventarioActualizado.findIndex(p => p._firebaseKey === producto._firebaseKey);
    let stockAnteriorPT = 0;
    let stockNuevoPT = cantidad;
    if (idxPT !== -1) {
        const pt = inventarioActualizado[idxPT];
        stockAnteriorPT = parseFloat(pt.stock) || 0;
        stockNuevoPT = stockAnteriorPT + cantidad;
        inventarioActualizado[idxPT] = { ...pt, stock: stockNuevoPT };
    }

    return { inventarioActualizado, materiaConsumida, stockAnteriorPT, stockNuevoPT };
}

/**
 * Ejecuta una produccion completa: valida, transforma y guarda
 * @param {Object} params - { productoKey, cantidad, inventario }
 * @returns {Promise<Object>} - Resultado de la produccion
 */
export async function ejecutarProduccionCompleta({ productoKey, cantidad, inventario }) {
    console.log(`[Production] Ejecutando produccion: ${cantidad} x ${productoKey}`);

    const producto = inventario.find(p => p._firebaseKey === productoKey);
    if (!producto) throw new Error('Producto no encontrado');

    // Validar
    const validacion = validarStockProduccion(producto, cantidad, inventario);
    if (!validacion.puedeProducir) {
        throw new Error('Stock insuficiente: ' + validacion.faltantes.join(', '));
    }

    // Calcular
    const calculo = calcularProduccion(producto, cantidad, inventario);

    // Obtener consecutivo
    const consecutivo = await dataManager.obtenerSiguienteConsecutivo();

    // Crear registro
    const registroProduccion = {
        codigo: consecutivo.toString(),
        productoKey,
        codigoProducto: producto.codigo,
        nombreProducto: producto.nombre,
        cantidadProducida: cantidad,
        materiaPrimaConsumida: calculo.materiaConsumida,
        fecha: new Date().toISOString(),
        timestamp: Date.now()
    };

    // Guardar todo
    const resultado = await dataManager.ejecutarProduccion({
        inventarioActualizado: calculo.inventarioActualizado,
        registroProduccion
    });

    console.log('[Production] Produccion completada #', consecutivo);

    return {
        ...resultado,
        consecutivo,
        producto: producto.nombre,
        cantidad,
        materiaConsumida: calculo.materiaConsumida
    };
}

/**
 * Obtiene el historial de produccion
 * @returns {Promise<Array>}
 */
export async function obtenerHistorialProduccion() {
    const registros = await dataManager.obtenerProduccion();
    return registros.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}
