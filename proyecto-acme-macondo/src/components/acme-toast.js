/**
 * acme-toast.js
 * Web Component: Sistema de notificaciones emergentes
 * Uso: <acme-toast></acme-toast> + document.querySelector('acme-toast').addToast(msg, type)
 */

class AcmeToast extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 1rem;
                    right: 1rem;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    max-width: 360px;
                    pointer-events: none;
                }
                .toast {
                    padding: 0.85rem 1.1rem;
                    border-radius: 3px;
                    background: #fff;
                    color: #1b2430;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
                    box-shadow: 0 8px 24px rgba(27,36,48,0.16);
                    border-left: 3px solid #2c4a63;
                    border-top: 1px solid #e1ddd3;
                    border-right: 1px solid #e1ddd3;
                    border-bottom: 1px solid #e1ddd3;
                    animation: toastIn 0.25s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    cursor: pointer;
                    pointer-events: auto;
                    line-height: 1.4;
                }
                .toast.out {
                    animation: toastOut 0.25s ease forwards;
                }
                .toast.success { border-left-color: #1f6f4f; }
                .toast.error { border-left-color: #9b2c2c; }
                .toast.warning { border-left-color: #8a5a0f; }
                .toast.info { border-left-color: #2c4a63; }
                .toast .icon { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; flex-shrink: 0; opacity: 0.6; }
                @keyframes toastIn {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes toastOut {
                    to { opacity: 0; transform: translateX(100%); }
                }
                @media (max-width: 480px) {
                    :host {
                        left: 1rem;
                        right: 1rem;
                        max-width: none;
                    }
                }
            </style>
            <div id="container"></div>
        `;
    }

    addToast(message, type = 'info') {
        const container = this.shadowRoot.getElementById('container');
        if (!container) return;

        const etiquetas = { success: 'Éxito', error: 'Error', warning: 'Aviso', info: 'Info' };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Construccion segura del DOM (sin innerHTML) para evitar XSS
        // si el mensaje llega a incluir datos capturados del usuario.
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.textContent = etiquetas[type] || etiquetas.info;
        const textSpan = document.createElement('span');
        textSpan.textContent = message;
        toast.appendChild(iconSpan);
        toast.appendChild(textSpan);

        // Cerrar al hacer click
        toast.addEventListener('click', () => this.removeToast(toast));

        container.appendChild(toast);
        console.log(`[Toast ${type}]`, message);

        // Auto cerrar en 4 segundos
        setTimeout(() => this.removeToast(toast), 4000);
    }

    removeToast(toast) {
        if (!toast || toast.classList.contains('out')) return;
        toast.classList.add('out');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }
}

customElements.define('acme-toast', AcmeToast);
