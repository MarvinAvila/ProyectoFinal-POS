import 'package:frontend_pos/core/http.dart';
import 'package:frontend_pos/chatbot/models/chat_response.dart';

class ChatbotRepository {
  final ApiClient _apiClient;

  ChatbotRepository(this._apiClient);

  /// Envía un mensaje al chatbot y obtiene la respuesta
  Future<ChatResponse> sendMessage(String message) async {
    try {
      print('🤖 [ChatbotRepository] Enviando mensaje: "$message"');
      
      final response = await _apiClient.post(
        '/chatbot/message',
        data: {'message': message},
      );
      
      print('✅ [ChatbotRepository] Respuesta recibida del backend');
      return ChatResponse.fromJson(response);
      
    } catch (e) {
      print('❌ [ChatbotRepository] Error enviando mensaje: $e');
      rethrow;
    }
  }

  /// Verifica el estado del servicio chatbot
  Future<Map<String, dynamic>> checkStatus() async {
    try {
      final response = await _apiClient.get('/chatbot/status');
      return response;
    } catch (e) {
      print('❌ [ChatbotRepository] Error verificando estado: $e');
      rethrow;
    }
  }
}