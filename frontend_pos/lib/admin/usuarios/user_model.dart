// lib/admin/usuarios/user_model.dart
class Usuario {
  final int? idUsuario;
  final String nombre;
  final String correo;
  final String? contrasenaHash;
  final String rol;
  final bool activo;
  final DateTime? creadoEn;
  final DateTime? ultimoLogin;
  final String? tokenRecuperacion;
  final DateTime? expiracionToken;
  final DateTime? actualizadoEn;

  Usuario({
    this.idUsuario,
    required this.nombre,
    required this.correo,
    this.contrasenaHash,
    required this.rol,
    this.activo = true,
    this.creadoEn,
    this.ultimoLogin,
    this.tokenRecuperacion,
    this.expiracionToken,
    this.actualizadoEn,
  });

  /// 🔹 Crear instancia desde JSON (del backend)
  factory Usuario.fromJson(Map<String, dynamic> json) {
    return Usuario(
      idUsuario: json['id_usuario'],
      nombre: json['nombre'] ?? '',
      correo: json['correo'] ?? '',
      contrasenaHash: json['contrasena_hash'],
      rol: json['rol'] ?? '',
      activo: json['activo'] ?? true,
      creadoEn:
          json['creado_en'] != null
              ? DateTime.tryParse(json['creado_en'])
              : null,
      ultimoLogin:
          json['ultimo_login'] != null
              ? DateTime.tryParse(json['ultimo_login'])
              : null,
      tokenRecuperacion: json['token_recuperacion'],
      expiracionToken:
          json['expiracion_token'] != null
              ? DateTime.tryParse(json['expiracion_token'])
              : null,
      actualizadoEn:
          json['actualizado_en'] != null
              ? DateTime.tryParse(json['actualizado_en'])
              : null,
    );
  }

  /// 🔹 Convertir a JSON para enviar al backend (create/update)
  Map<String, dynamic> toJson() {
    return {
      if (idUsuario != null) 'id_usuario': idUsuario,
      'nombre': nombre,
      'correo': correo,
      if (contrasenaHash != null) 'contrasena_hash': contrasenaHash,
      'rol': rol,
      'activo': activo,
      if (creadoEn != null) 'creado_en': creadoEn!.toIso8601String(),
      if (ultimoLogin != null) 'ultimo_login': ultimoLogin!.toIso8601String(),
      if (tokenRecuperacion != null) 'token_recuperacion': tokenRecuperacion,
      if (expiracionToken != null)
        'expiracion_token': expiracionToken!.toIso8601String(),
      if (actualizadoEn != null)
        'actualizado_en': actualizadoEn!.toIso8601String(),
    };
  }

  /// 🔹 Crear copia modificada (para update)
  Usuario copyWith({
    int? idUsuario,
    String? nombre,
    String? correo,
    String? contrasenaHash,
    String? rol,
    bool? activo,
    DateTime? creadoEn,
    DateTime? ultimoLogin,
    String? tokenRecuperacion,
    DateTime? expiracionToken,
    DateTime? actualizadoEn,
  }) {
    return Usuario(
      idUsuario: idUsuario ?? this.idUsuario,
      nombre: nombre ?? this.nombre,
      correo: correo ?? this.correo,
      contrasenaHash: contrasenaHash ?? this.contrasenaHash,
      rol: rol ?? this.rol,
      activo: activo ?? this.activo,
      creadoEn: creadoEn ?? this.creadoEn,
      ultimoLogin: ultimoLogin ?? this.ultimoLogin,
      tokenRecuperacion: tokenRecuperacion ?? this.tokenRecuperacion,
      expiracionToken: expiracionToken ?? this.expiracionToken,
      actualizadoEn: actualizadoEn ?? this.actualizadoEn,
    );
  }

  /// 🔹 Representación legible
  @override
  String toString() {
    return 'Usuario(id: $idUsuario, nombre: $nombre, correo: $correo, rol: $rol, activo: $activo)';
  }
}
