/**
 * ============================================================
 * dataManager.js
 * Centralizador unico de peticiones a Firebase Realtime Database
 * Metodos: GET, PUT (Firebase REST API)
 * ============================================================
 */

const FIREBASE_URL = 'https://proyectojavascriptacme-default-rtdb.firebaseio.com';

class DataManager {
    constructor() {
        this.baseUrl = FIREBASE_URL;
        console.log('[DataManager] Inicializado con URL:', this.baseUrl);
    }

    // ---- Helpers ----

    _url(node) {
        return `${this.baseUrl}/${node}.json`;
    }

    _handleError(error, context) {
        console.error(`[DataManager] Error en ${context}:`, error);
        throw error;
    }

    // ---- METODOS CRUD GENERICOS ----

    /**
     * Obtiene todos los datos de un nodo
     * @param {string} node - nombre del nodo (usuarios, inventario, produccion)
     * @returns {Promise<Array>} - array de objetos
     */
    async obtenerTodos(node) {
        try {
            console.log(`[DataManager] GET /${node}`);
            const res = await fetch(this._url(node));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Firebase retorna null si esta vacio, un objeto si tiene datos
            if (!data) return [];
            // Convertir objeto indexado a array
            const array = Object.entries(data).map(([key, val]) => ({
                _firebaseKey: key,
                ...val
            }));
            console.log(`[DataManager] GET /${node} => ${array.length} registros`);
            return array;
        } catch (err) {
            this._handleError(err, `obtenerTodos(${node})`);
        }
    }

    /**
     * Obtiene un nodo raw (objeto completo con keys de Firebase)
     * @param {string} node - nombre del nodo
     * @returns {Promise<Object|null>}
     */
    async obtenerRaw(node) {
        try {
            console.log(`[DataManager] GET (raw) /${node}`);
            const res = await fetch(this._url(node));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log(`[DataManager] GET (raw) /${node} =>`, data ? 'con datos' : 'vacío');
            return data || {};
        } catch (err) {
            this._handleError(err, `obtenerRaw(${node})`);
        }
    }

    /**
     * Guarda un array completo en un nodo (sobrescribe todo)
     * Firebase con PUT reemplaza todo el nodo
     * @param {string} node - nombre del nodo
     * @param {Array} array - array de objetos a guardar
     */
    async guardarArray(node, array) {
        try {
            console.log(`[DataManager] PUT /${node} => ${array.length} registros`);
            // Convertir array a objeto indexado para Firebase
            const objetoIndexado = {};
            array.forEach((item, index) => {
                const key = item._firebaseKey || `item_${index}`;
                const { _firebaseKey, ...sinKey } = item;
                objetoIndexado[key] = sinKey;
            });

            const res = await fetch(this._url(node), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(objetoIndexado)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log(`[DataManager] PUT /${node} OK`);
            return data;
        } catch (err) {
            this._handleError(err, `guardarArray(${node})`);
        }
    }

    /**
     * Agrega un nuevo item a un nodo existente (PATCH)
     * Genera una key automatica de Firebase
     * @param {string} node - nombre del nodo
     * @param {Object} item - objeto a agregar
     * @returns {Promise<string>} - key generada
     */
    async agregarItem(node, item) {
        try {
            console.log(`[DataManager] POST /${node}`, item);
            // Usar POST para que Firebase genere key unica
            const res = await fetch(this._url(node), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log(`[DataManager] POST /${node} OK, key:`, data.name);
            return data.name;
        } catch (err) {
            this._handleError(err, `agregarItem(${node})`);
        }
    }

    /**
     * Actualiza un item especifico por su Firebase key
     * @param {string} node - nombre del nodo
     * @param {string} key - Firebase key
     * @param {Object} datos - datos a actualizar
     */
    async actualizarItem(node, key, datos) {
        try {
            console.log(`[DataManager] PATCH /${node}/${key}`, datos);
            const res = await fetch(`${this.baseUrl}/${node}/${key}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log(`[DataManager] PATCH /${node}/${key} OK`);
            return data;
        } catch (err) {
            this._handleError(err, `actualizarItem(${node}, ${key})`);
        }
    }

    /**
     * Elimina un item por su Firebase key
     * @param {string} node - nombre del nodo
     * @param {string} key - Firebase key
     */
    async eliminarItem(node, key) {
        try {
            console.log(`[DataManager] DELETE /${node}/${key}`);
            const res = await fetch(`${this.baseUrl}/${node}/${key}.json`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            console.log(`[DataManager] DELETE /${node}/${key} OK`);
            return true;
        } catch (err) {
            this._handleError(err, `eliminarItem(${node}, ${key})`);
        }
    }

    // ---- METODOS ESPECIFICOS DE NEGOCIO ----

    // --- Usuarios ---
    async obtenerUsuarios() {
        return await this.obtenerTodos('usuarios');
    }

    async guardarUsuarios(usuarios) {
        return await this.guardarArray('usuarios', usuarios);
    }

    async crearUsuario(usuario) {
        return await this.agregarItem('usuarios', usuario);
    }

    async actualizarUsuario(key, datos) {
        return await this.actualizarItem('usuarios', key, datos);
    }

    async eliminarUsuario(key) {
        return await this.eliminarItem('usuarios', key);
    }

    // --- Inventario ---
    async obtenerInventario() {
        return await this.obtenerTodos('inventario');
    }

    async obtenerInventarioRaw() {
        return await this.obtenerRaw('inventario');
    }

    async guardarInventario(inventario) {
        return await this.guardarArray('inventario', inventario);
    }

    async crearProducto(producto) {
        return await this.agregarItem('inventario', producto);
    }

    async actualizarProducto(key, datos) {
        return await this.actualizarItem('inventario', key, datos);
    }

    async eliminarProducto(key) {
        return await this.eliminarItem('inventario', key);
    }

    // --- Produccion ---
    async obtenerProduccion() {
        return await this.obtenerTodos('produccion');
    }

    async obtenerProduccionRaw() {
        return await this.obtenerRaw('produccion');
    }

    async guardarProduccion(produccion) {
        return await this.guardarArray('produccion', produccion);
    }

    async crearRegistroProduccion(registro) {
        return await this.agregarItem('produccion', registro);
    }

    /**
     * Obtiene el siguiente consecutivo de produccion
     * Busca el maximo codigo existente y suma 1
     */
    async obtenerSiguienteConsecutivo() {
        try {
            const registros = await this.obtenerProduccion();
            if (registros.length === 0) return 1;
            const max = Math.max(...registros.map(r => parseInt(r.codigo) || 0));
            return max + 1;
        } catch (err) {
            console.warn('[DataManager] Error obteniendo consecutivo, usando 1:', err);
            return 1;
        }
    }

    // ---- Bulk Update: Produccion + Inventario (transaccion simulada) ----
    /**
     * Ejecuta una produccion: actualiza inventario y crea registro de produccion
     * @param {Object} params - { inventarioActualizado, registroProduccion }
     */
    async ejecutarProduccion({ inventarioActualizado, registroProduccion }) {
        console.log('[DataManager] Ejecutando produccion completa...');
        try {
            // 1. Guardar inventario actualizado
            await this.guardarInventario(inventarioActualizado);
            console.log('[DataManager] Inventario actualizado OK');

            // 2. Crear registro de produccion
            const key = await this.crearRegistroProduccion(registroProduccion);
            console.log('[DataManager] Registro de produccion creado, key:', key);

            return { ok: true, produccionKey: key };
        } catch (err) {
            this._handleError(err, 'ejecutarProduccion');
        }
    }

    // --- Mermas / Perdidas de inventario ---
    async obtenerMermas() {
        return await this.obtenerTodos('mermas');
    }

    async crearMerma(registro) {
        return await this.agregarItem('mermas', registro);
    }

    /**
     * Registra una merma: descuenta stock de un producto y guarda el motivo
     * @param {Object} params - { inventarioActualizado, registroMerma }
     */
    async ejecutarMerma({ inventarioActualizado, registroMerma }) {
        console.log('[DataManager] Registrando merma...');
        try {
            await this.guardarInventario(inventarioActualizado);
            const key = await this.crearMerma(registroMerma);
            console.log('[DataManager] Merma registrada, key:', key);
            return { ok: true, mermaKey: key };
        } catch (err) {
            this._handleError(err, 'ejecutarMerma');
        }
    }
}

// Singleton export
export const dataManager = new DataManager();
export default dataManager;
