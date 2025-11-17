// src/services/productoService.js

const db = require('../config/database');
const {
    productoRepository,
    categoriaRepository,
    proveedorRepository
} = require('../repositories/productoRepository');
const Producto = require('../models/Producto');
const helpers = require('../utils/helpers');
const QueryBuilder = require('../utils/queryBuilder');
const BarcodeGenerator = require('../utils/barcodeGenerator');
const BarcodeService = require('./barcodeService');
const QRService = require('./qrService');
const cloudinary = require('../config/cloudinary'); // Importa cloudinary

// Clase de error personalizada
class BusinessError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

/**
 * Enriquece un objeto de producto (de la BD) con métodos del modelo.
 */
function enrichProducto(productoData) {
    if (!productoData) return null;
    
    // Crear instancia del modelo para usar sus métodos
    const productoModel = Producto.fromDatabaseRow(productoData);

    return {
        ...productoData,
        // Añadir campos calculados
        necesita_reposicion: productoModel.necesitaReposicion(),
        por_caducar: productoModel.estaPorCaducar(),
        margen_ganancia: productoModel.margenGanancia(),
        ganancia_unitaria: productoModel.calcularGanancia(),
        estado_stock: productoModel.getEstadoStock(),
        dias_para_caducar: productoModel.diasParaCaducar(),
        es_rentable: productoModel.esRentable(),
    };
}

const productoService = {

    async getAllProductos(query) {
        const {
            q, categoria, proveedor, con_stock_minimo, por_caducar,
            sortBy = "nombre", sortOrder = "ASC"
        } = query;
        
        const { page: pageNum, limit: limitNum, offset } = helpers.getPaginationParams(query);
        const searchTerm = q ? QueryBuilder.sanitizeSearchTerm(q) : null;
        
        const params = [];
        const whereConditions = ["p.activo = true"];
        let paramIndex = 1;

        if (searchTerm) {
            whereConditions.push(`(p.nombre ILIKE $${paramIndex} OR p.codigo_barra ILIKE $${paramIndex})`);
            params.push(`%${searchTerm}%`);
            paramIndex++;
        }
        if (categoria && !isNaN(categoria)) {
            whereConditions.push(`p.id_categoria = $${paramIndex++}`);
            params.push(QueryBuilder.validateId(categoria));
        }
        if (proveedor && !isNaN(proveedor)) {
            whereConditions.push(`p.id_proveedor = $${paramIndex++}`);
            params.push(QueryBuilder.validateId(proveedor));
        }
        if (con_stock_minimo === "true") {
            whereConditions.push(`p.stock <= 5`);
        }
        if (por_caducar === "true") {
            whereConditions.push(`p.fecha_caducidad IS NOT NULL AND p.fecha_caducidad <= CURRENT_DATE + INTERVAL '30 days'`);
        }
        
        const validSortFields = ["nombre", "precio_venta", "stock", "fecha_creacion", "fecha_caducidad"];
        const sortField = validSortFields.includes(sortBy) ? sortBy : "nombre";
        const order = sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC";
        
        const whereSQL = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

        const { productos, total } = await productoRepository.findAll({
            whereSQL, params, sortField, order, 
            limit: limitNum, offset
        });
        
        const productosEnriquecidos = productos.map(p => enrichProducto(p));

        return {
            productos: productosEnriquecidos,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
            filtros: { q, categoria, proveedor, con_stock_minimo, por_caducar },
        };
    },

    async getProductoById(id) {
        const validId = QueryBuilder.validateId(id);
        const productoData = await productoRepository.findById(validId);
        if (!productoData) {
            throw new BusinessError("Producto no encontrado", 404);
        }
        return enrichProducto(productoData);
    },
    
    async getProductoByBarcode(code) {
        if (!code || code.trim() === "") {
            throw new BusinessError("Código de barras no puede estar vacío", 400);
        }
        const productoData = await productoRepository.findByBarcode(code);
        if (!productoData) {
            throw new BusinessError("Producto con ese código de barras no encontrado", 404);
        }
        return enrichProducto(productoData);
    },

    async createProducto(data, file) {
        const { id_categoria, id_proveedor, nombre, codigo_barra, precio_compra, precio_venta, stock, unidad, fecha_caducidad } = data;
        
        const codigoBarraFinal = codigo_barra?.trim() || (await BarcodeGenerator.generateUniqueBarcode());
        if (!codigoBarraFinal) {
            throw new BusinessError("No se pudo generar un código de barras válido", 500);
        }
        
        const productoData = {
            nombre: helpers.sanitizeInput(nombre),
            codigo_barra: codigoBarraFinal,
            precio_compra: parseFloat(precio_compra),
            precio_venta: parseFloat(precio_venta),
            stock: parseFloat(stock) || 0,
            unidad: unidad || "unidad",
            fecha_caducidad: fecha_caducidad || null,
            id_categoria: id_categoria ? QueryBuilder.validateId(id_categoria) : null,
            id_proveedor: id_proveedor ? QueryBuilder.validateId(id_proveedor) : null,
            imagen: null,
            activo: true, // Asumido de la lógica del controller
            fecha_creacion: new Date(),
        };

        const validationErrors = Producto.validate(productoData);
        if (validationErrors.length > 0) {
            throw new BusinessError(`Errores de validación: ${validationErrors.join(', ')}`, 400);
        }

        const client = await db.getClient();
        try {
            await client.query("BEGIN");
            
            if (await productoRepository.findByCode(productoData.codigo_barra, null, client)) {
                throw new BusinessError("Ya existe un producto con ese código de barras", 409);
            }
            if (productoData.id_categoria && !(await categoriaRepository.findById(productoData.id_categoria, client))) {
                throw new BusinessError("Categoría no encontrada", 404);
            }
            if (productoData.id_proveedor && !(await proveedorRepository.findById(productoData.id_proveedor, client))) {
                throw new BusinessError("Proveedor no encontrado", 404);
            }

            if (file) {
                const b64 = Buffer.from(file.buffer).toString("base64");
                const dataURI = "data:" + file.mimetype + ";base64," + b64;
                const result = await cloudinary.uploader.upload(dataURI, {
                    folder: "punto_venta",
                    quality: "auto:good", fetch_format: "auto"
                });
                productoData.imagen = result.secure_url;
            }

            // Generar Códigos QR y de Barras
            let codigosGenerados = null;
            try {
                const barcodeResult = await BarcodeService.generateProductCodes(productoData);
                const qrResult = await QRService.generateProductQR({ ...productoData, codigo_barras_url: barcodeResult.barcode_url });
                
                codigosGenerados = {
                    barcode_url: barcodeResult.barcode_url,
                    qr_url: qrResult.qr_url,
                    codigos_public_ids: {
                        barcode: barcodeResult.barcode_public_id,
                        qr: qrResult.qr_public_id,
                    },
                };
                
                productoData.codigo_barras_url = codigosGenerados.barcode_url;
                productoData.codigo_qr_url = codigosGenerados.qr_url;
                productoData.codigos_public_ids = JSON.stringify(codigosGenerados.codigos_public_ids);

            } catch (error) {
                console.warn("Error generando códigos, continuando sin códigos:", error);
                // No lanzar error, permitir creación sin códigos
            }

            const nuevoProducto = await productoRepository.create(productoData, client);
            await client.query("COMMIT");
            
            return { nuevoProducto, codigosGenerados };

        } catch (error) {
            await client.query("ROLLBACK");
            if (file && productoData.imagen) { // Si falló la BD, borrar imagen subida
                _deleteImageFromCloudinary(productoData.imagen);
            }
            throw error; // Re-lanzar para el controlador
        } finally {
            client.release();
        }
    },
    
    async updateProducto(id, updates, file) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        
        try {
            await client.query("BEGIN");

            const productoActual = await productoRepository.findByIdSimple(validId, client);
            if (!productoActual) {
                throw new BusinessError("Producto no encontrado", 404);
            }

            let codigoBarraCambiado = false;
            let nuevoCodigoBarra = productoActual.codigo_barra;

            // Lógica para determinar el nuevo código de barras
            if (updates.codigo_barra !== undefined) {
                const codigoIngresado = updates.codigo_barra?.trim();
                if (codigoIngresado === "") { // Generar automático
                    nuevoCodigoBarra = await BarcodeGenerator.generateUniqueBarcode();
                    codigoBarraCambiado = true;
                } else if (codigoIngresado && codigoIngresado !== productoActual.codigo_barra) { // Usar nuevo
                    nuevoCodigoBarra = codigoIngresado;
                    codigoBarraCambiado = true;
                }
            } else if (!productoActual.codigo_barra) { // Producto viejo sin código
                 nuevoCodigoBarra = await BarcodeGenerator.generateUniqueBarcode();
                 codigoBarraCambiado = true;
            }

            // Validar unicidad si cambió
            if (codigoBarraCambiado) {
                if (await productoRepository.findByCode(nuevoCodigoBarra, validId, client)) {
                    throw new BusinessError("Ya existe otro producto con ese código de barras", 409);
                }
            }
            
            // Preparar datos para actualizar
            const updatesParaBD = { ...updates };
            updatesParaBD.codigo_barra = nuevoCodigoBarra; // Siempre setear el código
            
            // Manejar imagen
            if (file) {
                if (productoActual.imagen) {
                    _deleteImageFromCloudinary(productoActual.imagen);
                }
                const b64 = Buffer.from(file.buffer).toString("base64");
                const dataURI = "data:" + file.mimetype + ";base64," + b64;
                const result = await cloudinary.uploader.upload(dataURI, {
                    folder: "punto_venta",
                    quality: "auto:good", fetch_format: "auto"
                });
                updatesParaBD.imagen = result.secure_url;
            }

            // Regenerar códigos QR/Barras si el código o la imagen cambiaron
            let nuevosCodigos = null;
            if (codigoBarraCambiado || file) {
                if (productoActual.codigos_public_ids) {
                    _deleteCodesFromCloudinary(productoActual.codigos_public_ids);
                }
                
                try {
                    // Preparamos los datos completos para los generadores
                    const productoDataParaCodigos = { ...productoActual, ...updatesParaBD };
                    
                    const barcodeResult = await BarcodeService.generateProductCodes(productoDataParaCodigos);
                    const qrResult = await QRService.generateProductQR({ ...productoDataParaCodigos, codigo_barras_url: barcodeResult.barcode_url });
                    
                    nuevosCodigos = {
                        barcode_url: barcodeResult.barcode_url,
                        qr_url: qrResult.qr_url,
                        codigos_public_ids: {
                            barcode: barcodeResult.barcode_public_id,
                            qr: qrResult.qr_public_id,
                        },
                    };
                    
                    updatesParaBD.codigo_barras_url = nuevosCodigos.barcode_url;
                    updatesParaBD.codigo_qr_url = nuevosCodigos.qr_url;
                    updatesParaBD.codigos_public_ids = JSON.stringify(nuevosCodigos.codigos_public_ids);

                } catch (error) {
                    console.warn("Error regenerando códigos en update:", error);
                    // No fallar la actualización, solo dejar los códigos nulos
                    updatesParaBD.codigo_barras_url = null;
                    updatesParaBD.codigo_qr_url = null;
                    updatesParaBD.codigos_public_ids = null;
                }
            }

            // Quitar campos no permitidos (por si acaso)
            const camposPermitidos = [
                'nombre', 'codigo_barra', 'precio_compra', 'precio_venta', 'stock', 
                'unidad', 'fecha_caducidad', 'id_categoria', 'id_proveedor', 'imagen',
                'codigo_barras_url', 'codigo_qr_url', 'codigos_public_ids'
            ];
            Object.keys(updatesParaBD).forEach(key => {
                if (!camposPermitidos.includes(key)) {
                    delete updatesParaBD[key];
                }
            });

            const productoActualizado = await productoRepository.update(validId, updatesParaBD, client);
            await client.query("COMMIT");
            
            return { productoActualizado, nuevosCodigos, codigoBarraCambiado };

        } catch (error) {
            await client.query("ROLLBACK");
            if (file && updates.imagen) { // Si falló la BD, borrar imagen subida
                _deleteImageFromCloudinary(updates.imagen);
            }
            throw error;
        } finally {
            client.release();
        }
    },
    
    async deleteProducto(id) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        try {
            await client.query("BEGIN");
            
            const producto = await productoRepository.findByIdSimple(validId, client);
            if (!producto) throw new BusinessError("Producto no encontrado", 404);

            const countVentas = await productoRepository.countVentas(validId, client);
            
            if (countVentas > 0) {
                // Desactivar (Soft Delete)
                await productoRepository.softDelete(validId, client);
                await client.query("COMMIT");
                return { modo: 'desactivado', countVentas, nombre: producto.nombre };
            } else {
                // Eliminar (Hard Delete)
                await productoRepository.deleteOfertas(validId, client);
                await productoRepository.hardDelete(validId, client);
                
                // Opcional: Eliminar imagen y códigos de Cloudinary
                if (producto.imagen) _deleteImageFromCloudinary(producto.imagen);
                if (producto.codigos_public_ids) _deleteCodesFromCloudinary(producto.codigos_public_ids);

                await client.query("COMMIT");
                return { modo: 'eliminado', countVentas: 0, nombre: producto.nombre };
            }

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    async getStats() {
        const [general, por_categoria] = await Promise.all([
            productoRepository.getStatsGeneral(),
            productoRepository.getStatsPorCategoria()
        ]);
        return { general, por_categoria };
    },

    async getProductCodes(id) {
        const validId = QueryBuilder.validateId(id);
        const producto = await productoRepository.findCodesById(validId);
        if (!producto) {
            throw new BusinessError("Producto no encontrado", 404);
        }
        
        return {
            producto_id: id,
            codigo_barra: producto.codigo_barra,
            barcode_url: producto.codigo_barras_url,
            qr_url: producto.codigo_qr_url,
            public_ids: producto.codigos_public_ids ? JSON.parse(producto.codigos_public_ids) : null,
            tiene_codigos: !!(producto.codigo_barras_url && producto.codigo_qr_url),
        };
    },
    
    async regenerateCodes(id, codigo_barra) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        
        try {
            await client.query("BEGIN");

            const productoActual = await productoRepository.findByIdSimple(validId, client);
            if (!productoActual) {
                throw new BusinessError("Producto no encontrado", 404);
            }

            let codigoBarraFinal = productoActual.codigo_barra;
            const codigoIngresado = codigo_barra?.trim();

            if (codigoIngresado) {
                codigoBarraFinal = codigoIngresado;
            } else {
                codigoBarraFinal = await BarcodeGenerator.generateUniqueBarcode();
            }
            
            if (!codigoBarraFinal) {
                throw new BusinessError("No se pudo determinar un código de barras válido", 500);
            }

            if (codigoBarraFinal !== productoActual.codigo_barra) {
                if (await productoRepository.findByCode(codigoBarraFinal, validId, client)) {
                    throw new BusinessError("Ya existe otro producto con ese código de barras", 409);
                }
            }

            // Eliminar códigos antiguos
            if (productoActual.codigos_public_ids) {
                _deleteCodesFromCloudinary(productoActual.codigos_public_ids);
            }

            // Preparar datos para generar códigos
            const productoData = { ...productoActual, codigo_barra: codigoBarraFinal };
            
            // Generar nuevos
            const barcodeResult = await BarcodeService.generateProductCodes(productoData);
            const qrResult = await QRService.generateProductQR({ ...productoData, codigo_barras_url: barcodeResult.barcode_url });

            const nuevosCodigos = {
                barcode_url: barcodeResult.barcode_url,
                qr_url: qrResult.qr_url,
                codigos_public_ids: JSON.stringify({
                    barcode: barcodeResult.barcode_public_id,
                    qr: qrResult.qr_public_id,
                }),
            };

            // Actualizar DB
            const productoActualizado = await productoRepository.update(validId, {
                codigo_barra: codigoBarraFinal,
                codigo_barras_url: nuevosCodigos.barcode_url,
                codigo_qr_url: nuevosCodigos.qr_url,
                codigos_public_ids: nuevosCodigos.codigos_public_ids
            }, client);

            await client.query("COMMIT");
            return productoActualizado;

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
};


// --- Funciones Helper Privadas del Servicio ---

async function _deleteImageFromCloudinary(imageUrl) {
    if (!imageUrl) return;
    try {
        const urlParts = imageUrl.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const publicId = "punto_venta/" + fileName.split(".")[0];
        await cloudinary.uploader.destroy(publicId);
    } catch (deleteError) {
        console.warn("No se pudo eliminar imagen anterior:", deleteError.message);
    }
}

async function _deleteCodesFromCloudinary(codigos_public_ids) {
    if (!codigos_public_ids) return;
    try {
        let publicIdsObj = (typeof codigos_public_ids === "string") ? JSON.parse(codigos_public_ids) : codigos_public_ids;
        if (publicIdsObj && typeof publicIdsObj === "object") {
            const publicIds = Object.values(publicIdsObj).filter(id => id && typeof id === "string");
            if (publicIds.length > 0) {
                await BarcodeService.deleteCodesFromCloudinary(publicIds);
            }
        }
    } catch (deleteError) {
        console.warn("Error eliminando códigos antiguos:", deleteError.message);
    }
}

module.exports = productoService;