/**
 * auth.js
 * Modulo de Autenticacion y Sesion
 * Logica operativa de login/logout independiente de la UI
 */

import { dataManager } from '../data/dataManager.js';

console.log('[Auth] Modulo de autenticacion cargado');

/**
 * Autentica un usuario por identificacion y contrasena
 * @param {string} identificacion - Numero de ID
 * @param {string} password - Contrasena
 * @returns {Promise<Object|null>} - Usuario autenticado o null
 */
export async function autenticarUsuario(identificacion, password) {
    console.log('[Auth] Autenticando:', identificacion);
    try {
        const usuarios = await dataManager.obtenerUsuarios();
        const usuario = usuarios.find(u =>
            u.identificacion === identificacion && u.password === password
        );
        if (usuario) {
            console.log('[Auth] Autenticacion exitosa:', usuario.nombreCompleto);
            return usuario;
        }
        console.warn('[Auth] Credenciales invalidas');
        return null;
    } catch (err) {
        console.error('[Auth] Error en autenticacion:', err);
        throw err;
    }
}

/**
 * Verifica si hay una sesion activa en localStorage
 * @returns {Object|null}
 */
export function verificarSesion() {
    try {
        const data = localStorage.getItem('acme_session');
        if (data) {
            const user = JSON.parse(data);
            console.log('[Auth] Sesion activa:', user.nombreCompleto);
            return user;
        }
    } catch (e) {
        console.warn('[Auth] Error verificando sesion:', e);
    }
    return null;
}

/**
 * Cierra la sesion actual
 */
export function cerrarSesion() {
    localStorage.removeItem('acme_session');
    console.log('[Auth] Sesion cerrada');
}

/**
 * Guarda la sesion en localStorage
 * @param {Object} usuario
 */
export function guardarSesion(usuario) {
    localStorage.setItem('acme_session', JSON.stringify(usuario));
    console.log('[Auth] Sesion guardada');
}

/**
 * Valida que un objeto usuario tenga todos los campos requeridos
 * @param {Object} usuario
 * @returns {Object} - { valido: boolean, errores: string[] }
 */
export function validarUsuario(usuario) {
    const errores = [];
    if (!usuario.identificacion?.trim()) errores.push('Identificacion es obligatoria');
    if (!usuario.nombreCompleto?.trim()) errores.push('Nombre completo es obligatorio');
    if (!usuario.cargo) errores.push('Cargo es obligatorio');
    if (!usuario.password || usuario.password.length < 4) errores.push('Contrasena minimo 4 caracteres');
    return { valido: errores.length === 0, errores };
}
