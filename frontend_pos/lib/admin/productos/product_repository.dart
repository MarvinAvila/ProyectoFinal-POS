// lib/productos/product_repository.dart
import 'dart:io'; // Para File
import 'dart:typed_data'; // Para Uint8List (web)
import 'package:flutter/foundation.dart'; // Para kIsWeb
import 'package:frontend_pos/core/http.dart'; // ApiClient, asMap, asList
import 'package:frontend_pos/core/env.dart'; // Endpoints
import 'package:dio/dio.dart'; // Para FormData y MultipartFile
import 'package:frontend_pos/core/paging.dart'; // Page<T>

import 'product_model.dart';

class ProductRepository {
  final _api = ApiClient();

  /// Lista de productos con paginación y búsqueda.
  Future<Page<Product>> list({
    int page = 1,
    int limit = 20,
    String? search,
    int? categoryId,
  }) async {
    final data = await _api.get(
      Endpoints.productos,
      query: {
        'page': page,
        'limit': limit,
        if (search != null && search.trim().isNotEmpty) 'q': search,
        if (categoryId != null) 'categoria': categoryId,
      },
    );

    List items;
    int total;

    if (data is Map) {
      final m = Map<String, dynamic>.from(data);
      items = asList(
        m['items'] ??
            m['data'] ??
            m['productos'] ??
            m['rows'] ??
            m['result'] ??
            m['results'] ??
            [],
      );
      total =
          (m['total'] ??
                  m['count'] ??
                  m['totalCount'] ??
                  m['total_count'] ??
                  items.length)
              as int? ??
          int.tryParse('${m['total'] ?? m['count'] ?? items.length}') ??
          items.length;
    } else {
      items = asList(data);
      total = items.length;
    }

    final productos =
        items.map((e) => Product.fromJson(Map<String, dynamic>.from(e))).toList();

    return Page<Product>(
      items: productos,
      page: page,
      pageSize: limit,
      total: total,
    );
  }

  Future<Product> getById(int id) async {
    final data = await _api.get('${Endpoints.productos}/$id');
    final m = (data is Map && data['data'] != null) ? asMap(data['data']) : asMap(data);
    return Product.fromJson(m);
  }

  /// 🆕 MÉTODO MULTIPLATAFORMA MEJORADO: Crear producto usando Model.toJson()
  Future<Product> create(Product p, {File? imageFile, Uint8List? imageBytes, String? imageFileName}) async {
    try {
      // 🆕 USAR EL MODELO CORRECTAMENTE - toJson() ya tiene los nombres correctos
      final productData = p.toJson();
      
      // 🆕 PREPARAR FormData CON LOS CAMPOS CORRECTOS
      final formData = FormData.fromMap({
        'nombre': productData['nombre'],
        'codigo_barra': productData['codigo_barra'],
        'precio_compra': productData['precio_compra']?.toString(), // ✅ Convertir a string
        'precio_venta': productData['precio_venta']?.toString(),   // ✅ Convertir a string
        'stock': productData['stock']?.toString(),                 // ✅ Convertir a string
        'unidad': productData['unidad'],
        if (productData['id_categoria'] != null) 
          'id_categoria': productData['id_categoria']?.toString(), // ✅ Convertir a string
        if (productData['id_proveedor'] != null) 
          'id_proveedor': productData['id_proveedor']?.toString(), // ✅ Convertir a string
        if (productData['fecha_caducidad'] != null) 
          'fecha_caducidad': productData['fecha_caducidad'],
      });

      // 🆕 SOPORTE MULTIPLATAFORMA PARA IMÁGENES
      await _addImageToFormData(formData, imageFile: imageFile, imageBytes: imageBytes, imageFileName: imageFileName);

      // 🆕 DEBUG
      if (kDebugMode) {
        print('📤 [Repository] Enviando producto usando Model.toJson():');
        formData.fields.forEach((field) {
          print('   ${field.key}: ${field.value}');
        });
        print('   imagen: ${imageBytes != null ? "${imageBytes.length} bytes" : imageFile != null ? "File" : "null"}');
      }

      final data = await _api.post(Endpoints.productos, data: formData);
      final m = (data is Map && data['data'] != null) ? asMap(data['data']) : asMap(data);
      return Product.fromJson(m);
      
    } catch (e) {
      if (kDebugMode) {
        print('❌ [Repository] Error en create: $e');
      }
      rethrow;
    }
  }

  /// 🆕 MÉTODO MULTIPLATAFORMA MEJORADO: Actualizar producto usando Model.toJson()
  Future<Product> update(Product p, {File? imageFile, Uint8List? imageBytes, String? imageFileName}) async {
    try {
      // 🆕 USAR EL MODELO CORRECTAMENTE
      final productData = p.toJson();
      
      final formData = FormData.fromMap({
        'nombre': productData['nombre'],
        'codigo_barra': productData['codigo_barra'],
        'precio_compra': productData['precio_compra']?.toString(),
        'precio_venta': productData['precio_venta']?.toString(),
        'stock': productData['stock']?.toString(),
        'unidad': productData['unidad'],
        if (productData['id_categoria'] != null) 
          'id_categoria': productData['id_categoria']?.toString(),
        if (productData['id_proveedor'] != null) 
          'id_proveedor': productData['id_proveedor']?.toString(),
        if (productData['fecha_caducidad'] != null) 
          'fecha_caducidad': productData['fecha_caducidad'],
      });

      // 🆕 SOPORTE MULTIPLATAFORMA PARA IMÁGENES
      await _addImageToFormData(formData, imageFile: imageFile, imageBytes: imageBytes, imageFileName: imageFileName);

      if (kDebugMode) {
        print('📤 [Repository] Actualizando producto usando Model.toJson():');
        formData.fields.forEach((field) {
          print('   ${field.key}: ${field.value}');
        });
      }

      final data = await _api.put('${Endpoints.productos}/${p.idProducto}', data: formData);
      final m = (data is Map && data['data'] != null) ? asMap(data['data']) : asMap(data);
      return Product.fromJson(m);
      
    } catch (e) {
      if (kDebugMode) {
        print('❌ [Repository] Error en update: $e');
      }
      rethrow;
    }
  }

  /// 🆕 MÉTODO AUXILIAR PRIVADO: Manejo de imágenes multiplataforma
  Future<void> _addImageToFormData(
    FormData formData, {
    File? imageFile,
    Uint8List? imageBytes,
    String? imageFileName,
  }) async {
    if (kIsWeb) {
      // Para WEB: usar bytes directamente
      if (imageBytes != null && imageFileName != null) {
        final multipartFile = MultipartFile.fromBytes(
          imageBytes,
          filename: imageFileName,
        );
        formData.files.add(MapEntry('imagen', multipartFile));
        
        if (kDebugMode) {
          print('🖼️ [Repository/WEB] Imagen preparada: $imageFileName (${imageBytes.length} bytes)');
        }
      }
    } else {
      // Para MÓVIL: usar File
      if (imageFile != null) {
        formData.files.add(MapEntry(
          'imagen',
          await MultipartFile.fromFile(
            imageFile.path,
            filename: imageFile.path.split('/').last,
          ),
        ));
        
        if (kDebugMode) {
          print('🖼️ [Repository/MÓVIL] Imagen preparada: ${imageFile.path}');
        }
      }
    }
  }

  /// Borrar producto
  Future<void> delete(int id) async {
    await _api.delete('${Endpoints.productos}/$id');
  }

  /// Busca un producto por su código de barras.
  Future<Product?> byBarcode(String code) async {
    try {
      final data = await _api.get('${Endpoints.productos}/barcode/$code');
      return Product.fromJson(asMap(data));
    } on ApiError catch (e) {
      if (e.status == 404) {
        return null;
      }
      rethrow;
    } catch (e) {
      throw Exception('Error inesperado al buscar por código de barras: $e');
    }
  }
}