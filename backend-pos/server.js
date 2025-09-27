require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./src/config/database'); // Importar la configuración de BD

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

// Función para verificar la conexión a la base de datos
async function verificarConexionBD() {
    try {
        const result = await db.query('SELECT current_database() as db_name, current_user as usuario, version() as postgres_version');
        console.log('🔍 INFORMACIÓN DE CONEXIÓN A BD:');
        console.log('   📊 Base de datos:', result.rows[0].db_name);
        console.log('   👤 Usuario:', result.rows[0].usuario);
        console.log('   🐘 PostgreSQL:', result.rows[0].postgres_version.split(',')[0]);
        
        // Verificar si existen tablas (opcional)
        const tablasResult = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            LIMIT 5
        `);
        console.log('   📋 Tablas existentes (primeras 5):', tablasResult.rows.map(t => t.table_name).join(', ') || 'Ninguna');
        
    } catch (error) {
        console.error('❌ ERROR DE CONEXIÓN A BD:', error.message);
    }
}

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

// Ruta de salud mejorada con info de BD
app.get('/api/health', async (req, res) => {
    try {
        const dbResult = await db.query('SELECT current_database() as db_name, current_user as usuario');
        
        res.json({ 
            success: true, 
            message: 'Servidor funcionando correctamente',
            database: {
                name: dbResult.rows[0].db_name,
                user: dbResult.rows[0].usuario,
                status: 'connected'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error de conexión a la base de datos',
            error: error.message 
        });
    }
});

// Ruta adicional para información detallada de BD
app.get('/api/db-info', async (req, res) => {
    try {
        const [dbInfo, tablas] = await Promise.all([
            db.query('SELECT current_database() as name, current_user as user, version() as version'),
            db.query(`
                SELECT table_name, table_type 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `)
        ]);
        
        res.json({
            success: true,
            database: dbInfo.rows[0],
            tables: tablas.rows,
            total_tables: tablas.rows.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
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

// Iniciar servidor con verificación de BD
app.listen(PORT, async () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Health check disponible en http://localhost:${PORT}/api/health`);
    console.log(`🔍 Info de BD disponible en http://localhost:${PORT}/api/db-info`);
    console.log('⏳ Verificando conexión a la base de datos...');
    
    // Verificar conexión a BD después de iniciar el servidor
    await verificarConexionBD();
});

module.exports = app;