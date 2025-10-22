class ChatResponse {
  final bool success;
  final String response;
  
  ChatResponse({
    required this.success,
    required this.response,
  });
  
  factory ChatResponse.fromJson(Map<String, dynamic> json) {
    return ChatResponse(
      success: json['success'] ?? false,
      response: json['data']?['response'] ?? json['response'] ?? 'Error en la respuesta',
    );
  }
  
  @override
  String toString() {
    return 'ChatResponse{success: $success, response: $response}';
  }
}