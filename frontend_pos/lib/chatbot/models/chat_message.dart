class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  
  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
  });
  
  @override
  String toString() {
    return 'ChatMessage{isUser: $isUser, text: $text}';
  }
}