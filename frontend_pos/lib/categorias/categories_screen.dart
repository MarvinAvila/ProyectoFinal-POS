// lib/categorias/categories_screen.dart
import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';

import 'category_model.dart';

//Cómo navegar a esta pantalla   Desde tu AppShell o main.dart, añade una ruta:
/// Base de la API: pásala al ejecutar:
/// flutter run --dart-define=API_BASE=http://localhost:3000
const String _kApiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'http://localhost:3000',
);

/// ========== API (privada al archivo) ==========
class _CategoriesApi {
  final Dio _dio;
  static const _storage = FlutterSecureStorage();

  _CategoriesApi._(this._dio);

  static Future<_CategoriesApi> Create() async {
    final dio = Dio(
      BaseOptions(
        baseUrl: '$_kApiBase/api',
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (o, h) async {
          final token = await _storage.read(key: 'token');
          if (token != null && token.isNotEmpty) {
            o.headers['Authorization'] = 'Bearer $token';
          }
          return h.next(o);
        },
      ),
    );

    return _CategoriesApi._(dio);
  }

  Future<List<Category>> getAll() async {
    final res = await _dio.get('/categorias');
    final data = res.data;

    List list;
    if (data is List) {
      list = data;
    } else if (data is Map && data['data'] is List) {
      list = data['data'];
    } else {
      list = [];
    }

    return list
        .map((e) => Category.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Category> create({required String nombre, String? descripcion}) async {
    final res = await _dio.post(
      '/categorias',
      data: {'nombre': nombre, 'descripcion': descripcion},
    );
    final map =
        (res.data is Map)
            ? Map<String, dynamic>.from(res.data)
            : <String, dynamic>{};
    // Si tu backend envía {success, data}, toma data; si no, usa todo el body.
    final payload =
        (map['data'] is Map) ? Map<String, dynamic>.from(map['data']) : map;
    return Category.fromJson(payload);
  }

  Future<Category> update({
    required int id,
    required String nombre,
    String? descripcion,
  }) async {
    final res = await _dio.put(
      '/categorias/$id',
      data: {'nombre': nombre, 'descripcion': descripcion},
    );
    final map =
        (res.data is Map)
            ? Map<String, dynamic>.from(res.data)
            : <String, dynamic>{};
    final payload =
        (map['data'] is Map) ? Map<String, dynamic>.from(map['data']) : map;
    return Category.fromJson(
      payload.isEmpty
          ? {'id_categoria': id, 'nombre': nombre, 'descripcion': descripcion}
          : payload,
    );
  }

  Future<void> delete(int id) async {
    await _dio.delete('/categorias/$id');
  }
}

/// ========== CONTROLLER ==========
class CategoriesController extends ChangeNotifier {
  late final _CategoriesApi _api;

  List<Category> _items = [];
  bool _loading = false;
  String? _error;

  List<Category> get items => _items;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> init() async {
    _api = await _CategoriesApi.Create();
    await load();
  }

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _items = await _api.getAll();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> create(String nombre, String? descripcion) async {
    try {
      final cat = await _api.create(nombre: nombre, descripcion: descripcion);
      _items = [..._items, cat];
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> update(Category c) async {
    try {
      final upd = await _api.update(
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
      );
      _items = _items.map((x) => x.id == c.id ? upd : x).toList();
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> remove(int id) async {
    try {
      await _api.delete(id);
      _items = _items.where((e) => e.id != id).toList();
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}

/// ========== UI ==========
class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => CategoriesController()..init(),
      child: const _CategoriesView(),
    );
  }
}

class _CategoriesView extends StatelessWidget {
  const _CategoriesView();

  Future<void> _openForm(BuildContext context, {Category? edit}) async {
    final ctrl = context.read<CategoriesController>();
    final result = await showDialog<_CategoryFormResult>(
      context: context,
      builder: (_) => _CategoryFormDialog(edit: edit),
    );
    if (result == null) return;

    final ok =
        edit == null
            ? await ctrl.create(result.nombre, result.descripcion)
            : await ctrl.update(
              edit.copyWith(
                nombre: result.nombre,
                descripcion: result.descripcion,
              ),
            );

    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ok ? 'Guardado ✅' : 'Error: ${ctrl.error ?? 'No se pudo guardar'}',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<CategoriesController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Categorías'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: ctrl.loading ? null : () => ctrl.load(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: ctrl.loading ? null : () => _openForm(context),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: ctrl.load,
        child: Builder(
          builder: (context) {
            if (ctrl.loading && ctrl.items.isEmpty) {
              return const Center(child: CircularProgressIndicator());
            }
            if (ctrl.error != null && ctrl.items.isEmpty) {
              return Center(child: Text('Error: ${ctrl.error}'));
            }
            if (ctrl.items.isEmpty) {
              return const Center(child: Text('No hay categorías'));
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: ctrl.items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final c = ctrl.items[i];
                return Dismissible(
                  key: ValueKey('cat_${c.id}'),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    color: Colors.red.withOpacity(0.1),
                    child: const Icon(Icons.delete_outline),
                  ),
                  confirmDismiss: (_) async {
                    return await showDialog<bool>(
                          context: context,
                          builder:
                              (_) => AlertDialog(
                                title: const Text('Eliminar'),
                                content: Text(
                                  '¿Eliminar la categoría "${c.nombre}"?',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed:
                                        () => Navigator.pop(context, false),
                                    child: const Text('Cancelar'),
                                  ),
                                  FilledButton(
                                    onPressed:
                                        () => Navigator.pop(context, true),
                                    child: const Text('Eliminar'),
                                  ),
                                ],
                              ),
                        ) ??
                        false;
                  },
                  onDismissed: (_) async {
                    final ok = await ctrl.remove(c.id);
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          ok
                              ? 'Eliminada ✅'
                              : 'Error: ${ctrl.error ?? 'No se pudo eliminar'}',
                        ),
                      ),
                    );
                  },
                  child: Card(
                    child: ListTile(
                      title: Text(c.nombre),
                      subtitle:
                          (c.descripcion?.isNotEmpty ?? false)
                              ? Text(c.descripcion!)
                              : null,
                      trailing: IconButton(
                        icon: const Icon(Icons.edit_outlined),
                        onPressed: () => _openForm(context, edit: c),
                      ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

/// ------- Diálogo de Alta/Edición --------
class _CategoryFormResult {
  final String nombre;
  final String? descripcion;
  _CategoryFormResult(this.nombre, this.descripcion);
}

class _CategoryFormDialog extends StatefulWidget {
  final Category? edit;
  const _CategoryFormDialog({this.edit});

  @override
  State<_CategoryFormDialog> createState() => _CategoryFormDialogState();
}

class _CategoryFormDialogState extends State<_CategoryFormDialog> {
  final _form = GlobalKey<FormState>();
  final _nombre = TextEditingController();
  final _desc = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.edit != null) {
      _nombre.text = widget.edit!.nombre;
      _desc.text = widget.edit!.descripcion ?? '';
    }
  }

  @override
  void dispose() {
    _nombre.dispose();
    _desc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.edit != null;
    return AlertDialog(
      title: Text(isEdit ? 'Editar categoría' : 'Nueva categoría'),
      content: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _nombre,
              decoration: const InputDecoration(
                labelText: 'Nombre',
                prefixIcon: Icon(Icons.category_outlined),
              ),
              validator:
                  (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _desc,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Descripción (opcional)',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () {
            if (_form.currentState?.validate() != true) return;
            Navigator.pop(
              context,
              _CategoryFormResult(
                _nombre.text.trim(),
                _desc.text.trim().isEmpty ? null : _desc.text.trim(),
              ),
            );
          },
          child: Text(isEdit ? 'Guardar' : 'Crear'),
        ),
      ],
    );
  }
}
