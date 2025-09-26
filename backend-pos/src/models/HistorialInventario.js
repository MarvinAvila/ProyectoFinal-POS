class HistorialInventario {
    constructor(id_historial, id_producto, cambio, motivo, fecha, id_usuario) {
        this.id_historial = id_historial;
        this.id_producto = id_producto;
        this.cambio = cambio; // positivo = entrada, negativo = salida
        this.motivo = motivo; // 'venta' | 'compra' | 'ajuste' | 'devolucion'
        this.fecha = fecha;
        this.id_usuario = id_usuario;
        
        // Campos para joins (se llenan después)
        this.producto_nombre = null;
        this.usuario_nombre = null;
        this.codigo_barra = null;
    }

    // ==================== MÉTODOS DE INSTANCIA ====================

    /**
     * Determina si el movimiento es una entrada de stock
     */
    esEntrada() {
        return this.cambio > 0;
    }

    /**
     * Determina si el movimiento es una salida de stock
     */
    esSalida() {
        return this.cambio < 0;
    }

    /**
     * Obtiene el tipo de movimiento en formato legible
     */
    getTipoMovimiento() {
        return this.esEntrada() ? 'ENTRADA' : 'SALIDA';
    }

    /**
     * Obtiene el valor absoluto del cambio (siempre positivo)
     */
    getCantidadAbsoluta() {
        return Math.abs(this.cambio);
    }

    /**
     * Obtiene el icono o símbolo representativo del movimiento
     */
    getIcono() {
        const iconos = {
            'venta': '🛒',
            'compra': '📦',
            'ajuste': '📊',
            'devolucion': '🔄'
        };
        return iconos[this.motivo] || '📝';
    }

    /**
     * Obtiene la descripción legible del motivo
     */
    getDescripcionMotivo() {
        const descripciones = {
            'venta': 'Venta de producto',
            'compra': 'Compra de inventario',
            'ajuste': 'Ajuste de stock',
            'devolucion': 'Devolución de cliente'
        };
        return descripciones[this.motivo] || this.motivo;
    }

    /**
     * Obtiene la clase CSS para estilizar (para frontend)
     */
    getClaseEstilo() {
        if (this.esEntrada()) {
            return 'movimiento-entrada text-success';
        } else {
            return 'movimiento-salida text-danger';
        }
    }

    /**
     * Verifica si el movimiento es reciente (últimas 24 horas)
     */
    esReciente() {
        const ahora = new Date();
        const fechaMovimiento = new Date(this.fecha);
        const diferenciaHoras = (ahora - fechaMovimiento) / (1000 * 60 * 60);
        return diferenciaHoras <= 24;
    }

    /**
     * Obtiene el tiempo transcurrido en formato legible
     */
    getTiempoTranscurrido() {
        const ahora = new Date();
        const fechaMovimiento = new Date(this.fecha);
        const diferenciaMs = ahora - fechaMovimiento;
        
        const segundos = Math.floor(diferenciaMs / 1000);
        const minutos = Math.floor(segundos / 60);
        const horas = Math.floor(minutos / 60);
        const dias = Math.floor(horas / 24);
        
        if (dias > 0) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
        if (horas > 0) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
        if (minutos > 0) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
        return 'Hace unos segundos';
    }

    /**
     * Valida la consistencia del movimiento
     */
    validar() {
        const errors = HistorialInventario.validate(this);
        if (errors.length > 0) {
            throw new Error(`Movimiento inválido: ${errors.join(', ')}`);
        }
        return true;
    }

    /**
     * Serializa para respuesta API
     */
    toJSON() {
        return {
            id_historial: this.id_historial,
            id_producto: this.id_producto,
            cambio: this.cambio,
            motivo: this.motivo,
            fecha: this.fecha,
            id_usuario: this.id_usuario,
            producto_nombre: this.producto_nombre,
            usuario_nombre: this.usuario_nombre,
            codigo_barra: this.codigo_barra,
            // Campos calculados
            tipo_movimiento: this.getTipoMovimiento(),
            cantidad_absoluta: this.getCantidadAbsoluta(),
            descripcion_motivo: this.getDescripcionMotivo(),
            icono: this.getIcono(),
            es_reciente: this.esReciente(),
            tiempo_transcurrido: this.getTiempoTranscurrido(),
            clase_estilo: this.getClaseEstilo()
        };
    }

    // ==================== MÉTODOS ESTÁTICOS ====================

    /**
     * Crea una instancia desde una fila de la base de datos
     */
    static fromDatabaseRow(row) {
        const historial = new HistorialInventario(
            row.id_historial,
            row.id_producto,
            parseFloat(row.cambio),
            row.motivo,
            row.fecha,
            row.id_usuario
        );
        
        // Campos de joins
        if (row.producto_nombre) historial.producto_nombre = row.producto_nombre;
        if (row.usuario_nombre) historial.usuario_nombre = row.usuario_nombre;
        if (row.codigo_barra) historial.codigo_barra = row.codigo_barra;
        if (row.nombre) historial.producto_nombre = row.nombre; // alias común
        
        return historial;
    }

    /**
     * Crea un nuevo movimiento de inventario
     */
    static crearMovimiento(id_producto, cambio, motivo, id_usuario = null) {
        return new HistorialInventario(
            null, // ID se generará en la BD
            id_producto,
            cambio,
            motivo,
            new Date(),
            id_usuario
        );
    }

    /**
     * Crea un movimiento de ajuste manual
     */
    static crearAjuste(id_producto, cantidad, id_usuario, nota = '') {
        const motivo = nota ? `ajuste: ${nota}` : 'ajuste';
        return this.crearMovimiento(id_producto, cantidad, motivo, id_usuario);
    }

    /**
     * Crea un movimiento de venta
     */
    static crearVenta(id_producto, cantidad, id_usuario) {
        return this.crearMovimiento(id_producto, -cantidad, 'venta', id_usuario);
    }

    /**
     * Crea un movimiento de compra/proveedor
     */
    static crearCompra(id_producto, cantidad, id_usuario) {
        return this.crearMovimiento(id_producto, cantidad, 'compra', id_usuario);
    }

    /**
     * Crea un movimiento de devolución
     */
    static crearDevolucion(id_producto, cantidad, id_usuario) {
        return this.crearMovimiento(id_producto, cantidad, 'devolucion', id_usuario);
    }

    /**
     * Valida los datos de un movimiento de inventario
     */
    static validate(movimientoData) {
        const errors = [];
        const motivosPermitidos = ['venta', 'compra', 'ajuste', 'devolucion'];

        // Validación de producto
        if (!movimientoData.id_producto || isNaN(movimientoData.id_producto)) {
            errors.push('ID de producto inválido');
        }

        // Validación de cambio/cantidad
        if (movimientoData.cambio === undefined || movimientoData.cambio === null) {
            errors.push('El cambio de stock es obligatorio');
        } else if (isNaN(movimientoData.cambio)) {
            errors.push('El cambio debe ser un número válido');
        } else if (movimientoData.cambio === 0) {
            errors.push('El cambio no puede ser cero');
        }

        // Validación de motivo
        if (!movimientoData.motivo) {
            errors.push('El motivo es obligatorio');
        } else if (!motivosPermitidos.includes(movimientoData.motivo)) {
            errors.push(`Motivo no válido. Permitidos: ${motivosPermitidos.join(', ')}`);
        }

        // Validación de fecha
        if (movimientoData.fecha) {
            const fecha = new Date(movimientoData.fecha);
            if (isNaN(fecha.getTime())) {
                errors.push('La fecha no es válida');
            } else if (fecha > new Date()) {
                errors.push('La fecha no puede ser futura');
            }
        }

        return errors;
    }

    /**
     * Filtra y clasifica movimientos por tipo
     */
    static clasificarMovimientos(movimientos) {
        return {
            entradas: movimientos.filter(m => m.esEntrada()),
            salidas: movimientos.filter(m => m.esSalida()),
            ventas: movimientos.filter(m => m.motivo === 'venta'),
            compras: movimientos.filter(m => m.motivo === 'compra'),
            ajustes: movimientos.filter(m => m.motivo === 'ajuste'),
            devoluciones: movimientos.filter(m => m.motivo === 'devolucion')
        };
    }

    /**
     * Calcula estadísticas de movimientos
     */
    static calcularEstadisticas(movimientos) {
        const clasificados = this.clasificarMovimientos(movimientos);
        
        return {
            total_movimientos: movimientos.length,
            total_entradas: clasificados.entradas.reduce((sum, m) => sum + m.getCantidadAbsoluta(), 0),
            total_salidas: clasificados.salidas.reduce((sum, m) => sum + m.getCantidadAbsoluta(), 0),
            cantidad_ventas: clasificados.ventas.length,
            cantidad_compras: clasificados.compras.length,
            cantidad_ajustes: clasificados.ajustes.length,
            movimiento_reciente: movimientos.length > 0 ? 
                movimientos.reduce((latest, current) => 
                    new Date(current.fecha) > new Date(latest.fecha) ? current : latest
                ) : null
        };
    }

    /**
     * Obtiene el resumen de movimientos por producto
     */
    static resumenPorProducto(movimientos) {
        const resumen = {};
        
        movimientos.forEach(movimiento => {
            if (!resumen[movimiento.id_producto]) {
                resumen[movimiento.id_producto] = {
                    id_producto: movimiento.id_producto,
                    producto_nombre: movimiento.producto_nombre,
                    total_entradas: 0,
                    total_salidas: 0,
                    movimientos: []
                };
            }
            
            if (movimiento.esEntrada()) {
                resumen[movimiento.id_producto].total_entradas += movimiento.getCantidadAbsoluta();
            } else {
                resumen[movimiento.id_producto].total_salidas += movimiento.getCantidadAbsoluta();
            }
            
            resumen[movimiento.id_producto].movimientos.push(movimiento);
        });
        
        return Object.values(resumen);
    }
}

module.exports = HistorialInventario;