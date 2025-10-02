// lib/auth/auth_controller.dart
import 'package:flutter/foundation.dart';
import 'auth_repository.dart';

class AuthController extends ChangeNotifier {
  final AuthRepository repo;

  bool _loading = false;
  String? _error;
  String? _token;
  Map<String, dynamic>? _user;

  bool get loading => _loading;
  String? get error => _error;
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  AuthController({required this.repo});

  /// Intenta leer token guardado y (opcional) cargar perfil
  Future<void> init({bool loadProfile = true}) async {
    _token = await repo.readToken();
    if (loadProfile && _token != null) {
      try {
        _user = await repo.me();
      } catch (_) {
        // si /me no existe o falla, no bloqueamos
      }
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final r = await repo.login(email, password);
      _token = r.token;
      _user = r.user;
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _loading = false;
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await repo.logout();
    _token = null;
    _user = null;
    notifyListeners();
  }
}
