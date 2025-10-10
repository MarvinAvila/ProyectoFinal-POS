const db = require('./database');

async function inicializarBaseDeDatos() {
    try {
        console.log('🔄 Inicializando base de datos...');

        // Ejecutar tu script SQL completo
        const sqlScript = `
            -- =====================================
            -- TABLA: Usuarios (autenticación)
            -- =====================================
            CREATE TABLE IF NOT EXISTS usuarios (
                id_usuario SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                correo VARCHAR(150) UNIQUE NOT NULL,
                contrasena_hash TEXT NOT NULL,
                rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'cajero', 'gerente', 'dueno')),
                activo BOOLEAN DEFAULT TRUE,
                creado_en TIMESTAMP DEFAULT NOW(),
                ultimo_login TIMESTAMP,
                token_recuperacion TEXT,
                expiracion_token TIMESTAMP,
                actualizado_en TIMESTAMP DEFAULT NOW()
            );

            -- =====================================
            -- TABLA: Proveedores
            -- =====================================
            CREATE TABLE IF NOT EXISTS proveedores (
                id_proveedor SERIAL PRIMARY KEY,
                nombre VARCHAR(150) NOT NULL,
                telefono VARCHAR(20),
                email VARCHAR(150),
                direccion TEXT
            );

            -- =====================================
            -- TABLA: Categorías de productos
            -- =====================================
            CREATE TABLE IF NOT EXISTS categorias (
                id_categoria SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                descripcion TEXT
            );

            -- =====================================
            -- TABLA: Productos
            -- =====================================
            CREATE TABLE IF NOT EXISTS productos (
                id_producto SERIAL PRIMARY KEY,
                nombre VARCHAR(200) NOT NULL,
                codigo_barra VARCHAR(50) UNIQUE NOT NULL,
                precio_compra NUMERIC(10,2) NOT NULL,
                precio_venta NUMERIC(10,2) NOT NULL,
                stock NUMERIC(10,2) NOT NULL DEFAULT 0,
                unidad VARCHAR(50) NOT NULL CHECK (unidad IN ('pieza','kg','lt','otro')),
                fecha_caducidad DATE,
                id_proveedor INT REFERENCES proveedores(id_proveedor) ON DELETE SET NULL,
                id_categoria INT REFERENCES categorias(id_categoria) ON DELETE SET NULL,
                imagen TEXT
            );

            -- =====================================
            -- TABLA: Ventas
            -- =====================================
            CREATE TABLE IF NOT EXISTS ventas (
                id_venta SERIAL PRIMARY KEY,
                fecha TIMESTAMP DEFAULT NOW(),
                id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
                forma_pago VARCHAR(50) NOT NULL CHECK (forma_pago IN ('efectivo','tarjeta','otro')),
                subtotal NUMERIC(12,2) NOT NULL,
                iva NUMERIC(12,2) NOT NULL,
                total NUMERIC(12,2) NOT NULL
            );

            -- =====================================
            -- TABLA débil: Detalle de venta
            -- =====================================
            CREATE TABLE IF NOT EXISTS detalle_venta (
                id_detalle SERIAL PRIMARY KEY,
                id_venta INT REFERENCES ventas(id_venta) ON DELETE CASCADE,
                id_producto INT REFERENCES productos(id_producto) ON DELETE SET NULL,
                cantidad NUMERIC(10,2) NOT NULL,
                precio_unitario NUMERIC(10,2) NOT NULL,
                subtotal NUMERIC(12,2) NOT NULL
            );

            -- =====================================
            -- TABLA: Ofertas y Descuentos
            -- =====================================
            CREATE TABLE IF NOT EXISTS ofertas (
                id_oferta SERIAL PRIMARY KEY,
                nombre VARCHAR(150) NOT NULL,
                descripcion TEXT,
                porcentaje_descuento NUMERIC(5,2) CHECK (porcentaje_descuento > 0 AND porcentaje_descuento <= 100),
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE NOT NULL,
                activo BOOLEAN DEFAULT TRUE
            );

            -- Relación N:M entre productos y ofertas
            CREATE TABLE IF NOT EXISTS producto_oferta (
                id_producto INT REFERENCES productos(id_producto) ON DELETE CASCADE,
                id_oferta INT REFERENCES ofertas(id_oferta) ON DELETE CASCADE,
                PRIMARY KEY (id_producto, id_oferta)
            );

            -- =====================================
            -- TABLA: Reportes (Histórico)
            -- =====================================
            CREATE TABLE IF NOT EXISTS reportes (
                id_reporte SERIAL PRIMARY KEY,
                tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ventas_dia','top_productos','stock_bajo')),
                fecha_generado TIMESTAMP DEFAULT NOW(),
                id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
                descripcion TEXT,
                contenido JSONB NOT NULL
            );

            -- =====================================
            -- TABLA: Alertas (stock/caducidad)
            -- =====================================
            CREATE TABLE IF NOT EXISTS alertas (
                id_alerta SERIAL PRIMARY KEY,
                id_producto INT REFERENCES productos(id_producto) ON DELETE CASCADE,
                tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('caducidad', 'stock_bajo')),
                mensaje TEXT NOT NULL,
                fecha TIMESTAMP DEFAULT NOW(),
                atendida BOOLEAN DEFAULT FALSE
            );

            -- =====================================
            -- TABLA: Historial de inventario
            -- =====================================
            CREATE TABLE IF NOT EXISTS historial_inventario (
                id_historial SERIAL PRIMARY KEY,
                id_producto INT REFERENCES productos(id_producto) ON DELETE CASCADE,
                cambio NUMERIC(10,2) NOT NULL,
                motivo VARCHAR(100) NOT NULL CHECK (motivo IN ('venta','compra','ajuste','devolucion')),
                fecha TIMESTAMP DEFAULT NOW(),
                id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
            );

            -- =====================================
            -- TABLA: Comprobantes de venta
            -- =====================================
            CREATE TABLE IF NOT EXISTS comprobantes (
                id_comprobante SERIAL PRIMARY KEY,
                id_venta INT REFERENCES ventas(id_venta) ON DELETE CASCADE,
                tipo VARCHAR(50) NOT NULL DEFAULT 'ticket',
                contenido TEXT NOT NULL,
                generado_en TIMESTAMP DEFAULT NOW()
            );
        `;

        // Ejecutar el script completo
        await db.query(sqlScript);
        
        console.log('✅ Base de datos inicializada correctamente');
        return { success: true, message: 'Base de datos inicializada' };
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

// Función para crear triggers (separado porque algunos entornos los bloquean)
async function crearTriggers() {
    try {
        console.log('🔄 Creando triggers...');
        
        const triggerScript = `
            -- Función que descuenta stock al registrar un detalle de venta
            CREATE OR REPLACE FUNCTION descontar_stock()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE productos
                SET stock = stock - NEW.cantidad
                WHERE id_producto = NEW.id_producto;

                INSERT INTO historial_inventario (id_producto, cambio, motivo, id_usuario)
                VALUES (NEW.id_producto, -NEW.cantidad, 'venta',
                        (SELECT id_usuario FROM ventas WHERE id_venta = NEW.id_venta));

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- Trigger asociado a detalle de venta
            DROP TRIGGER IF EXISTS tr_descontar_stock ON detalle_venta;
            CREATE TRIGGER tr_descontar_stock
            AFTER INSERT ON detalle_venta
            FOR EACH ROW
            EXECUTE FUNCTION descontar_stock();

            -- Función que genera alerta cuando stock es bajo
            CREATE OR REPLACE FUNCTION generar_alerta_stock()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.stock < 5 THEN
                    INSERT INTO alertas (id_producto, tipo, mensaje)
                    VALUES (NEW.id_producto, 'stock_bajo', 'El producto tiene poco stock');
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- Trigger asociado a productos
            DROP TRIGGER IF EXISTS tr_alerta_stock ON productos;
            CREATE TRIGGER tr_alerta_stock
            AFTER UPDATE OF stock ON productos
            FOR EACH ROW
            EXECUTE FUNCTION generar_alerta_stock();
        `;

        await db.query(triggerScript);
        console.log('✅ Triggers creados correctamente');
        
    } catch (error) {
        console.warn('⚠️  No se pudieron crear los triggers (puede ser normal en algunos entornos):', error.message);
    }
}

module.exports = {
    inicializarBaseDeDatos,
    crearTriggers
};