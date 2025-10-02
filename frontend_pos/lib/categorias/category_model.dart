// lib/categorias/category_model.dart

class Category {
  final int id;
  final String nombre;
  final String? descripcion;

  Category({required this.id, required this.nombre, this.descripcion});

  factory Category.fromJson(Map<String, dynamic> j) {
    // Soporta llaves alternativas por si cambian en el backend
    final id =
        j['id_categoria'] ?? j['id'] ?? j['categoriaId'] ?? j['categoryId'];
    return Category(
      id: (id is int) ? id : int.tryParse('$id') ?? 0,
      nombre: (j['nombre'] ?? j['name'] ?? '').toString(),
      descripcion: j['descripcion']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id_categoria': id,
    'nombre': nombre,
    'descripcion': descripcion,
  };

  Category copyWith({String? nombre, String? descripcion}) => Category(
    id: id,
    nombre: nombre ?? this.nombre,
    descripcion: descripcion ?? this.descripcion,
  );
}
