# 🏭 Acme Produccion - Macondo

Sistema de automatizacion del proceso productivo para la planta Acme en la ciudad de Macondo.

## 📋 Descripcion del Proyecto

Aplicacion web desarrollada con **HTML5**, **CSS3** y **JavaScript Vanilla (ES6+)** que permite gestionar:

- **Usuarios:** Registro y autenticacion con doble validacion de contrasena
- **Inventario/Bodega:** Control de materia prima y productos terminados con formulas
- **Produccion:** Motor de transformacion que consume materia prima y genera productos terminados

La persistencia de datos se realiza en **Firebase Realtime Database** mediante la API REST utilizando `fetch` con `async/await`.

---

## 🚀 Como Ejecutar el Proyecto

### Opcion 1: Servidor Local (Recomendado)

1. Clonar o descargar el repositorio
2. Abrir el proyecto en **Visual Studio Code**
3. Instalar la extension **Live Server** (Ritwick Dey)
4. Clic derecho en `index.html` → **"Open with Live Server"**
5. El navegador se abrira automaticamente en `http://127.0.0.1:5500`

### Opcion 2: Servidor Python

```bash
# Python 3
python -m http.server 5500

# Python 2
python -m SimpleHTTPServer 5500
```
Luego abrir: `http://localhost:5500`

### Opcion 3: Node.js (http-server)

```bash
npx http-server -p 5500
```

### ⚠️ Importante

- Es necesario usar **un servidor local** (no abrir el HTML directamente) debido a los modulos ES6 (`type="module"`) y la politica CORS.
- La base de datos Firebase ya esta configurada y lista para usar.

---

## 🏗️ Estructura del Proyecto

```
proyecto-acme-macondo/
│
├── index.html                  # Punto de entrada principal
├── style.css                   # Estilos globales, responsive, temas
├── README.md                   # Documentacion tecnica
│
├── src/
│   ├── main.js                 # Orquestador principal de la app
│   │
│   ├── data/
│   │   └── dataManager.js      # Centralizador de peticiones Firebase
│   │                           # (GET, PUT, POST, PATCH, DELETE)
│   │
│   ├── components/             # Web Components encapsulados y reutilizables
│   │   ├── acme-toast.js       # Sistema de notificaciones emergentes
│   │   ├── acme-login.js       # Login y registro de usuarios
│   │   ├── acme-users.js       # CRUD completo de usuarios
│   │   ├── acme-inventory.js   # Gestion de inventario y formulas
│   │   └── acme-production.js  # Motor de produccion
│   │
│   └── modules/                # Logica operativa independiente
│       ├── auth.js             # Autenticacion y sesiones
│       ├── inventory.js        # Operaciones de bodega
│       └── production.js       # Motor de transformacion
```

---

## 🗄️ Estructura de Datos en Firebase

### Nodo: `usuarios`

```json
{
  "usuarios": {
    "-O1AbC2dE3fG4hI5jK6l": {
      "identificacion": "123456789",
      "nombreCompleto": "Juan Perez",
      "cargo": "Administrador",
      "password": "****",
      "fechaRegistro": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Nodo: `inventario`

```json
{
  "inventario": {
    "-O2MnO3pQ4rS5tU6vW7x": {
      "codigo": "MP-001",
      "nombre": "Harina de trigo",
      "proveedor": "Distribuidora del Norte",
      "tipo": "materia_prima",
      "stock": 500,
      "unidad": "g",
      "stockMinimo": 1000,
      "fechaCreacion": "2024-01-10T08:00:00.000Z"
    },
    "-O3YzA4bC5dE6fG7hI8j": {
      "codigo": "PT-001",
      "nombre": "Galleta de mantequilla",
      "proveedor": "Acme",
      "tipo": "producto_terminado",
      "stock": 50,
      "unidad": "unidad",
      "formula": [
        { "codigoMP": "MP-001", "cantidad": 100 },
        { "codigoMP": "MP-002", "cantidad": 100 },
        { "codigoMP": "MP-003", "cantidad": 1 }
      ],
      "fechaCreacion": "2024-01-12T14:00:00.000Z"
    }
  }
}
```

> `unidad` y `stockMinimo` son campos adicionales opcionales: los productos creados antes de esta actualizacion siguen funcionando igual, simplemente no muestran unidad ni alerta de stock minimo hasta que se editen.

### Nodo: `produccion`

```json
{
  "produccion": {
    "-O4KlM5nO6pQ7rS8tU9v": {
      "codigo": "1",
      "productoKey": "-O3YzA4bC5dE6fG7hI8j",
      "codigoProducto": "PT-001",
      "nombreProducto": "Galleta de mantequilla",
      "cantidadProducida": 10,
      "materiaPrimaConsumida": [
        { "codigo": "MP-001", "nombre": "Harina de trigo", "cantidad": 1000, "stockAnterior": 500, "stockNuevo": 400 },
        { "codigo": "MP-002", "nombre": "Mantequilla", "cantidad": 1000, "stockAnterior": 300, "stockNuevo": 200 },
        { "codigo": "MP-003", "nombre": "Huevo", "cantidad": 10, "stockAnterior": 100, "stockNuevo": 90 }
      ],
      "usuarioNombre": "Juan Perez",
      "fecha": "2024-01-20T16:45:00.000Z",
      "timestamp": 1705767900000
    }
  }
}
```

### Nodo: `mermas` (nuevo)

```json
{
  "mermas": {
    "-O5PqR6sT7uV8wX9yZ0a": {
      "codigoProducto": "MP-002",
      "nombreProducto": "Mantequilla",
      "cantidad": 20,
      "unidad": "g",
      "motivo": "Producto vencido",
      "stockAnterior": 200,
      "stockNuevo": 180,
      "usuario": "Juan Perez",
      "fecha": "2024-01-21T09:15:00.000Z"
    }
  }
}
```

---

## ⚡ Funcionalidades Implementadas

### 🔐 Login / Autenticacion

- Acceso por **identificacion + contrasena**
- Validacion de credenciales contra Firebase
- Navegacion lateral oculta hasta el login
- Sesion persistente con `localStorage`
- Cierre de sesion completo
- Estados de carga (spinner) en los botones de login/registro

### 👥 Modulo de Usuarios (CRUD)

- Crear usuario: ID, nombre completo, cargo, contrasena
- **Doble validacion de contrasena** (password + confirmacion en tiempo real)
- Editar usuario (cambiar nombre, cargo, password opcional)
- Eliminar usuario con confirmacion
- Busqueda en tiempo real por ID, nombre o cargo
- **Paginacion** de la tabla (10 registros por pagina)
- **Exportar a CSV**

### 📦 Modulo de Inventario (CRUD + Bodega)

- Crear producto: codigo, nombre, proveedor, tipo, stock inicial
- **Tipos:** Materia Prima o Producto Terminado
- **Unidad de medida** por producto (g, kg, ml, l, unidad, lb)
- **Stock minimo configurable** con alerta visual en la tabla y en el Dashboard
- **Formula/Receta** para productos terminados (materia prima + cantidad por unidad), mostrando la unidad de cada ingrediente
- Ingresar materia prima al inventario (aumentar stock existente)
- **Registro de mermas/perdidas** (producto, cantidad, motivo, usuario) que descuenta stock y queda en el nodo `mermas`
- Editar producto (incluyendo formula, unidad y stock minimo)
- Eliminar producto con confirmacion
- **Buscador en tiempo real** por codigo, nombre o proveedor
- **Validacion de codigo unico en tiempo real** (con debounce) al crear un producto
- Visualizacion de tipo con badges de color
- **Paginacion** y **exportacion a CSV**

### 🏭 Modulo de Produccion (Motor de Transformacion)

1. **Seleccion** del producto terminado a fabricar
2. **Preview de formula** con verificacion de stock en tiempo real (incluye unidad de medida)
3. **Validacion de stock:** compara stock actual vs requerido (formula x cantidad)
4. **Transformacion:** resta materias primas y suma producto terminado
5. **Consecutivo automatico** iniciando en 1, incrementando secuencialmente
6. **Registro del usuario** que ejecuto la produccion (auditoria basica)
7. **Guardado historico** en el nodo `produccion` de Firebase
8. **Resumen de produccion** con materia prima consumida y cantidad fabricada
9. **Historial completo** de todas las producciones con buscador, **paginacion** y **exportacion a CSV**

### 📊 Panel General (Dashboard)

- Indicadores de productos, materia prima y productos terminados
- **Alertas de stock bajo**: lista de productos por debajo de su stock minimo configurado

---

## 🎨 Web Components Reutilizables

| Componente | Descripcion |
|------------|-------------|
| `<acme-toast>` | Notificaciones emergentes (success, error, warning, info) |
| `<acme-login>` | Formulario de login y registro con validaciones |
| `<acme-users>` | Tabla y formulario CRUD de usuarios |
| `<acme-inventory>` | Tabla y formulario CRUD de inventario con formulas |
| `<acme-production>` | Motor de produccion con resumen e historial |

---

## 🔌 API de Firebase (dataManager.js)

| Metodo | Descripcion |
|--------|-------------|
| `obtenerTodos(node)` | GET - Obtiene array de registros |
| `obtenerRaw(node)` | GET - Obtiene objeto raw de Firebase |
| `guardarArray(node, array)` | PUT - Guarda array completo (sobrescribe) |
| `agregarItem(node, item)` | POST - Agrega item con key auto-generada |
| `actualizarItem(node, key, datos)` | PATCH - Actualiza campos especificos |
| `eliminarItem(node, key)` | DELETE - Elimina un registro |
| `ejecutarProduccion(params)` | Transaccion: guarda inventario + registro |
| `obtenerSiguienteConsecutivo()` | Calcula el siguiente numero de produccion |

---

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estructura semantica
- **CSS3** - Flexbox, Grid, Custom Properties, Animaciones, Responsive
- **JavaScript ES6+** - Modulos, Clases, Async/Await, Arrow Functions, Spread
- **Web Components** - Custom Elements, Shadow DOM, Templates
- **Firebase Realtime Database** - Persistencia en la nube via REST API
- **Fetch API** - Peticiones HTTP con async/await

---

## 📱 Responsive Design

El sistema es completamente responsive:

- **Desktop (> 768px):** Sidebar fijo a la izquierda, contenido principal a la derecha
- **Tablet/Mobile (<= 768px):** Sidebar colapsable con boton hamburguesa, layouts en columna
- **Small Mobile (<= 480px):** Grids de 1 columna, tablas con scroll horizontal

---

## 🔒 Consideraciones de Seguridad

- Las contrasenas se almacenan en texto plano en Firebase (ejercicio academico)
- En produccion real, usar hashing (bcrypt) y autenticacion de Firebase Auth
- La base de datos tiene reglas basicas de lectura/escritura publica

---

## 📊 Datos de Prueba (Opcional)

Para probar el sistema rapidamente, puede crear los siguientes productos:

**Materias Primas:**
| Codigo | Nombre | Stock Inicial |
|--------|--------|---------------|
| MP-001 | Harina de trigo | 10000 |
| MP-002 | Mantequilla | 5000 |
| MP-003 | Huevo (unidad) | 1000 |
| MP-004 | Azucar | 8000 |
| MP-005 | Chocolate | 3000 |

**Producto Terminado (ejemplo):**
| Codigo | Nombre | Formula |
|--------|--------|---------|
| PT-001 | Galleta de mantequilla | 100g Harina + 100g Mantequilla + 1 Huevo |

---

## 👨‍💻 Desarrollador

Proyecto individual desarrollado para la automatizacion de la planta Acme en Macondo.

---

## 📄 Licencia

Proyecto academico. Todos los derechos reservados.
