import 'package:flutter/foundation.dart';
import 'package:frontend_pos/chatbot/models/chat_message.dart';
import 'package:frontend_pos/chatbot/models/chat_response.dart';
import 'package:frontend_pos/chatbot/repositories/chatbot_repository.dart';

class ChatProvider with ChangeNotifier {
  final ChatbotRepository _repository;
  
  List<ChatMessage> _messages = [];
  bool _isLoading = false;
  String? _error;
  
  List<ChatMessage> get messages => List.unmodifiable(_messages);
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  ChatProvider(this._repository);
  
  /// Envía un mensaje al chatbot
  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;
    
    // Agregar mensaje del usuario
    _messages.add(ChatMessage(
      text: text.trim(),
      isUser: true,
      timestamp: DateTime.now(),
    ));
    
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      // Obtener respuesta del backend
      final ChatResponse response = await _repository.sendMessage(text);
      
      // Agregar respuesta del chatbot
      _messages.add(ChatMessage(
        text: response.response,
        isUser: false,
        timestamp: DateTime.now(),
      ));
      
      print('✅ [ChatProvider] Mensaje procesado exitosamente');
      
    } catch (e) {
      // Mensaje de error
      _messages.add(ChatMessage(
        text: '❌ Error: No se pudo conectar con el asistente. Verifica tu conexión.',
        isUser: false,
        timestamp: DateTime.now(),
      ));
      
      _error = e.toString();
      print('❌ [ChatProvider] Error: $e');
      
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  /// Limpia el historial del chat
  void clearChat() {
    _messages.clear();
    _error = null;
    notifyListeners();
    print('🧹 [ChatProvider] Chat limpiado');
  }
  
  /// Verifica el estado del servicio
  Future<void> checkServiceStatus() async {
    try {
      _isLoading = true;
      notifyListeners();
      
      final status = await _repository.checkStatus();
      print('📊 [ChatProvider] Estado del servicio: $status');
      
    } catch (e) {
      _error = 'No se pudo verificar el estado del servicio';
      print('❌ [ChatProvider] Error verificando estado: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}