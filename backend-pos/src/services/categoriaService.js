// src/services/categoriaService.js

const db = require('../config/database');
const categoriaRepository = require('../repositories/categoriaRepository');
const Categoria = require('../models/Categoria');
const helpers = require('../utils/helpers');
const QueryBuilder = require('../utils/queryBuilder');
const ModelMapper = require('../utils/modelMapper');

// Clase de error personalizada
class BusinessError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

const categoriaService = {

    async getAllCategorias(queryParams) {
        const { page, limit, offset } = helpers.getPaginationParams(queryParams);
        const searchTerm = QueryBuilder.sanitizeSearchTerm(queryParams.q);
        
        const { categorias, total } = await categoriaRepository.findAll({ searchTerm, limit, offset });

        return {
            categorias,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    },

    async getCategoriaById(id) {
        const validId = QueryBuilder.validateId(id);
        const categoria = await categoriaRepository.findById(validId);
        if (!categoria) {
            throw new BusinessError('Categoría no encontrada', 404);
        }
        return categoria;
    },

    async createCategoria(data) {
        const { nombre, descripcion } = data;
        if (!nombre || !nombre.trim()) {
            throw new BusinessError('El nombre de la categoría es obligatorio', 400);
        }

        const nombreSanitizado = helpers.sanitizeInput(nombre);
        const descripcionSanitizada = descripcion ? helpers.sanitizeInput(descripcion) : null;

        const validationErrors = Categoria.validate({ nombre: nombreSanitizado, descripcion: descripcionSanitizada });
        if (validationErrors.length > 0) {
            throw new BusinessError(validationErrors.join(', '), 400);
        }
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const existente = await categoriaRepository.findByName(nombreSanitizado, client);
            if (existente) {
                throw new BusinessError('Ya existe una categoría con ese nombre', 409);
            }

            const categoria = await categoriaRepository.create({ 
                nombre: nombreSanitizado, 
                descripcion: descripcionSanitizada 
            }, client);
            
            await client.query('COMMIT');
            return categoria;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error; // Re-lanza el error
        } finally {
            client.release();
        }
    },

    async updateCategoria(id, data) {
        const validId = QueryBuilder.validateId(id);
        const { nombre, descripcion } = data;

        const updates = {};
        if (nombre !== undefined) updates.nombre = helpers.sanitizeInput(nombre);
        if (descripcion !== undefined) updates.descripcion = descripcion ? helpers.sanitizeInput(descripcion) : null;

        if (Object.keys(updates).length === 0) {
            throw new BusinessError('No hay campos para actualizar', 400);
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const categoriaActual = await categoriaRepository.findById(validId);
            if (!categoriaActual) {
                throw new BusinessError('Categoría no encontrada', 404);
            }

            if (updates.nombre) {
                const nombreExistente = await categoriaRepository.findByNameAndNotId(updates.nombre, validId, client);
                if (nombreExistente) {
                    throw new BusinessError('Ya existe otra categoría con ese nombre', 409);
                }
            }

            // Validar datos finales
            const categoriaTemp = {
                nombre: updates.nombre || categoriaActual.nombre,
                descripcion: updates.descripcion !== undefined ? updates.descripcion : categoriaActual.descripcion
            };
            const validationErrors = Categoria.validate(categoriaTemp);
            if (validationErrors.length > 0) {
                throw new BusinessError(validationErrors.join(', '), 400);
            }

            const categoriaActualizada = await categoriaRepository.update(validId, updates, client);
            
            await client.query('COMMIT');
            return categoriaActualizada;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async deleteCategoria(id) {
        const validId = QueryBuilder.validateId(id);
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const categoria = await categoriaRepository.findById(validId);
            if (!categoria) {
                throw new BusinessError('Categoría no encontrada', 404);
            }
            
            const countProductos = await categoriaRepository.countProductsByCategoriaId(validId, client);
            if (countProductos > 0) {
                throw new BusinessError(
                    `No se puede eliminar la categoría porque tiene ${countProductos} producto(s) asociado(s)`, 
                    409 // Conflicto
                );
            }

            const categoriaEliminada = await categoriaRepository.delete(validId, client);
            
            await client.query('COMMIT');
            return categoriaEliminada; // Devuelve la categoría eliminada para el log

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getProductosByCategoria(id, queryParams) {
        const validId = QueryBuilder.validateId(id);
        const { page, limit, offset } = helpers.getPaginationParams(queryParams);

        const categoria = await categoriaRepository.findById(validId);
        if (!categoria) {
            throw new BusinessError('Categoría no encontrada', 404);
        }

        const { productos, total } = await categoriaRepository.findProductosByCategoriaId(validId, { limit, offset });
        
        return {
            categoria: categoria,
            productos: productos,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    },
    
    // El método PATCH es muy similar al UPDATE, lo unificamos en 'updateCategoria'
    // Si 'patch' tiene una lógica de negocio fundamentalmente diferente, se crearía.
    // En este caso, el 'update' original y 'patch' son casi idénticos.
    // Usaremos el 'update' que es más completo.

    async moverProductos(idOrigen, idDestino, productos_ids) {
        const validIdOrigen = QueryBuilder.validateId(idOrigen);
        const validIdDestino = QueryBuilder.validateId(idDestino);

        if (validIdOrigen === validIdDestino) {
            throw new BusinessError('La categoría origen y destino no pueden ser la misma', 400);
        }
        if (!productos_ids || !Array.isArray(productos_ids) || productos_ids.length === 0) {
             throw new BusinessError('La lista de IDs de productos es requerida', 400);
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            // Verificar que ambas categorías existen
            const [categoriaOrigen, categoriaDestino] = await Promise.all([
                categoriaRepository.findById(validIdOrigen),
                categoriaRepository.findById(validIdDestino)
            ]);
            if (!categoriaOrigen) throw new BusinessError('Categoría origen no encontrada', 404);
            if (!categoriaDestino) throw new BusinessError('Categoría destino no encontrada', 404);

            // Verificar que los productos existen y pertenecen a la categoría origen
            const productosValidos = await categoriaRepository.checkProductsInCategoria(productos_ids, validIdOrigen, client);
            if (!productosValidos) {
                throw new BusinessError('Algunos productos no existen o no pertenecen a la categoría origen', 400);
            }

            // Mover productos
            const productosMovidosCount = await categoriaRepository.moveProducts(validIdDestino, productos_ids, client);

            await client.query('COMMIT');
            
            return {
                productos_movidos: productosMovidosCount,
                categoria_origen: categoriaOrigen,
                categoria_destino: categoriaDestino
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getEstadisticas() {
        const { globales, categorias_populares, productos_sin_categoria } = await categoriaRepository.getGlobalEstadisticas();
        
        return {
            globales: {
                total_categorias: parseInt(globales.total_categorias) || 0,
                categorias_activas: parseInt(globales.categorias_activas) || 0,
                total_productos_categorizados: parseInt(globales.total_productos_categorizados) || 0,
                productos_sin_categoria: parseInt(productos_sin_categoria) || 0
            },
            categorias_populares: categorias_populares.map(row => ({
                id_categoria: row.id_categoria,
                nombre: row.nombre,
                total_productos: parseInt(row.total_productos),
                total_stock: parseFloat(row.total_stock),
                precio_promedio: parseFloat(row.precio_promedio)
            }))
        };
    },

    async getEstadisticasCategoria(id) {
        const validId = QueryBuilder.validateId(id);
        
        const [categoria, estadisticas] = await Promise.all([
            categoriaRepository.findById(validId),
            categoriaRepository.getEstadisticasForCategoria(validId)
        ]);

        if (!categoria) {
            throw new BusinessError('Categoría no encontrada', 404);
        }
        
        const { productos, inventario } = estadisticas;

        return {
            categoria: categoria,
            productos: {
                total: parseInt(productos.total_productos) || 0,
                total_stock: parseFloat(productos.total_stock) || 0,
                precio_compra_promedio: parseFloat(productos.precio_compra_promedio) || 0,
                precio_venta_promedio: parseFloat(productos.precio_venta_promedio) || 0,
                productos_bajo_stock: parseInt(productos.productos_bajo_stock) || 0,
                productos_por_caducar: parseInt(productos.productos_por_caducar) || 0
            },
            inventario: {
                valor_total: parseFloat(inventario.valor_total) || 0
            }
        };
    }
};

module.exports = categoriaService;