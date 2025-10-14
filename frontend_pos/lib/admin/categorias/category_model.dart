class Categoria {
  final int? idCategoria;
  final String nombre;
  final String? descripcion;

  Categoria({this.idCategoria, required this.nombre, this.descripcion});

  factory Categoria.fromJson(Map<String, dynamic> json) {
    return Categoria(
      idCategoria: json['id_categoria'],
      nombre: json['nombre'] ?? '',
      descripcion: json['descripcion'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (idCategoria != null) 'id_categoria': idCategoria,
      'nombre': nombre,
      'descripcion': descripcion,
    };
  }
}
