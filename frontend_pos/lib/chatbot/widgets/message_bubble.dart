import 'package:flutter/material.dart';
import 'package:frontend_pos/chatbot/models/chat_message.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  
  const MessageBubble({Key? key, required this.message}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      child: Row(
        mainAxisAlignment: message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!message.isUser) _buildBotIcon(),
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: message.isUser 
                    ? Colors.blue[100] 
                    : Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: message.isUser 
                      ? Colors.blue[300]! 
                      : Colors.grey[300]!,
                ),
              ),
              child: Text(
                message.text,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.black87,
                ),
              ),
            ),
          ),
          if (message.isUser) _buildUserIcon(),
        ],
      ),
    );
  }
  
  Widget _buildBotIcon() {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: const CircleAvatar(
        backgroundColor: Color(0xFFE3F2FD),
        child: Icon(Icons.smart_toy, color: Colors.blue, size: 18),
      ),
    );
  }
  
  Widget _buildUserIcon() {
    return Container(
      margin: const EdgeInsets.only(left: 8),
      child: const CircleAvatar(
        backgroundColor: Color(0xFFE8F5E8),
        child: Icon(Icons.person, color: Colors.green, size: 18),
      ),
    );
  }
}