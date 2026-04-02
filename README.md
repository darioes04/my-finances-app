# 💰 Finanzas — App de gestión personal

App web personal para gestionar ingresos y gastos con React + Supabase.

---

## 🗄️ Paso 1 — Crear las tablas en Supabase

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Abre **SQL Editor** en el menú lateral
3. Copia y pega todo el contenido de `supabase_schema.sql`
4. Pulsa **Run**

Esto crea las tablas `categories` y `transactions` con categorías por defecto ya insertadas.

---

## 🚀 Paso 2 — Arrancar la app

```bash
# Desde la carpeta del proyecto
npm install
npm run dev
```

Abre http://localhost:5173 en tu navegador.

---

## 📁 Estructura del proyecto

```
finanzas-app/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx   # Vista principal con resumen y gráficas
│   │   ├── TransactionForm.jsx  # Formulario añadir/editar
│   │   ├── History.jsx     # Historial con búsqueda y filtros
│   │   └── Nav.jsx         # Barra de navegación
│   ├── App.jsx             # Componente raíz
│   ├── supabase.js         # Cliente Supabase
│   ├── main.jsx
│   └── index.css
├── supabase_schema.sql     # Schema de base de datos
└── package.json
```

---

## ✨ Funcionalidades

- ✅ Añadir ingresos y gastos con categoría, fecha y notas
- ✅ Resumen mensual: ingresos, gastos y ahorro
- ✅ Gráfica de evolución de los últimos 6 meses
- ✅ Desglose de gastos por categoría
- ✅ Historial completo con búsqueda y filtros
- ✅ Editar y eliminar transacciones
- ✅ Datos persistidos en Supabase (nube)
