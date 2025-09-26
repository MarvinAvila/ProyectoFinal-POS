require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Importar rutas
const authRoutes = require('./src/routes/auth');
const usuarioRoutes = require('./src/routes/usuarios');
const productoRoutes = require('./src/routes/productos');
const proveedorRoutes = require('./src/routes/proveedores');
const ventaRoutes = require('./src/routes/ventas');
const reporteRoutes = require('./src/routes/reportes');
const categoriaRoutes = require('./src/routes/categorias');
const alertaRoutes = require('./src/routes/alertas');
const dashboardRoutes = require('./src/routes/dashboard');
const inventarioRoutes = require('./src/routes/inventario');
const ofertaRoutes = require('./src/routes/ofertas');
const comprobanteRoutes = require('./src/routes/comprobantes');
const detalleVentaRoutes = require('./src/routes/detalleVenta');
const productoOfertaRoutes = require('./src/routes/productoOferta');

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/alertas', alertaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ofertas', ofertaRoutes);
app.use('/api/comprobantes', comprobanteRoutes);
app.use('/api/detalle-venta', detalleVentaRoutes);
app.use('/api/producto-oferta', productoOfertaRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Manejo de errores 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Ruta no encontrada' 
    });
});

// Manejo global de errores
app.use((error, req, res, next) => {
    console.error('Error global:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Health check disponible en http://localhost:${PORT}/api/health`);
});

module.exports = app;