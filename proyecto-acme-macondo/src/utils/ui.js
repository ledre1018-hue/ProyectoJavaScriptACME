/**
 * ============================================================
 * ui.js
 * Utilidades de interfaz compartidas entre componentes:
 * - Paginacion de listas en tablas
 * - Debounce para validaciones en tiempo real
 * - Exportacion de tablas a CSV
 * - Manejo de estado "cargando" en botones
 * ============================================================
 */

/**
 * Retorna la porcion de un array correspondiente a una pagina
 * @param {Array} lista
 * @param {number} pagina - 1-indexado
 * @param {number} porPagina
 */
export function paginar(lista, pagina, porPagina) {
    const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
    const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
    const inicio = (paginaSegura - 1) * porPagina;
    return {
        items: lista.slice(inicio, inicio + porPagina),
        paginaActual: paginaSegura,
        totalPaginas,
        total: lista.length
    };
}

/**
 * Renderiza los controles de paginacion dentro de un contenedor
 * @param {HTMLElement} container
 * @param {Object} info - { paginaActual, totalPaginas, total, porPagina }
 * @param {Function} onChange - callback(nuevaPagina)
 */
export function renderPaginacion(container, info, onChange) {
    if (!container) return;

    if (info.total === 0) {
        container.innerHTML = '';
        return;
    }

    const inicio = (info.paginaActual - 1) * info.porPagina + 1;
    const fin = Math.min(info.paginaActual * info.porPagina, info.total);

    container.innerHTML = `
        <span>Mostrando ${inicio}-${fin} de ${info.total} registros</span>
        <div class="pager-controls">
            <button type="button" data-page="prev" ${info.paginaActual <= 1 ? 'disabled' : ''}>‹ Anterior</button>
            <span class="page-current">Pagina ${info.paginaActual} de ${info.totalPaginas}</span>
            <button type="button" data-page="next" ${info.paginaActual >= info.totalPaginas ? 'disabled' : ''}>Siguiente ›</button>
        </div>
    `;

    const btnPrev = container.querySelector('[data-page="prev"]');
    const btnNext = container.querySelector('[data-page="next"]');
    if (btnPrev) btnPrev.addEventListener('click', () => onChange(info.paginaActual - 1));
    if (btnNext) btnNext.addEventListener('click', () => onChange(info.paginaActual + 1));
}

/**
 * Debounce generico
 * @param {Function} fn
 * @param {number} delay - ms
 */
export function debounce(fn, delay = 350) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Exporta un arreglo de objetos a un archivo CSV descargable
 * @param {string} filename
 * @param {Array<string>} headers - encabezados de columna
 * @param {Array<Array>} rows - filas de datos (arrays de valores)
 */
export function exportarCSV(filename, headers, rows) {
    const escapar = (val) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const lineas = [
        headers.map(escapar).join(','),
        ...rows.map(row => row.map(escapar).join(','))
    ];

    // BOM para que Excel reconozca UTF-8 (tildes, ñ) correctamente
    const contenido = '\uFEFF' + lineas.join('\r\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Pone/quita el estado visual "cargando" en un boton (spinner + bloqueo)
 * @param {HTMLElement} btn
 * @param {boolean} loading
 */
export function setBotonCargando(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.dataset.originalDisabled = btn.disabled ? '1' : '0';
        btn.classList.add('is-loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('is-loading');
        btn.disabled = btn.dataset.originalDisabled === '1';
    }
}

/**
 * Obtiene el usuario de la sesion activa (localStorage) sin depender de main.js,
 * para evitar importaciones circulares entre componentes.
 * @returns {Object|null}
 */
export function obtenerUsuarioSesion() {
    try {
        const data = localStorage.getItem('acme_session');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}
