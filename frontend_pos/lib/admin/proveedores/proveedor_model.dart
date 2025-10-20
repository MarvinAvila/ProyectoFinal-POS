import 'proveedor_form.dart';
import 'proveedores_screen.dart';
import 'proveedores_controller.dart';

// lib/admin/proveedores/proveedor_model.dart
class Proveedor {
  final int? idProveedor;
  final String nombre;
  final String? telefono;
  final String? email;
  final String? direccion;
  final int? totalProductos;

  Proveedor({
    this.idProveedor,
    required this.nombre,
    this.telefono,
    this.email,
    this.direccion,
    this.totalProductos,
  });

  factory Proveedor.fromJson(Map<String, dynamic> json) {
    return Proveedor(
      idProveedor: json['id_proveedor'],
      nombre: json['nombre'] ?? '',
      telefono: json['telefono'],
      email: json['email'],
      direccion: json['direccion'],
      totalProductos:
          json['total_productos'] != null
              ? int.tryParse(json['total_productos'].toString())
              : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (idProveedor != null) 'id_proveedor': idProveedor,
      'nombre': nombre,
      'telefono': telefono,
      'email': email,
      'direccion': direccion,
    };
  }
}
