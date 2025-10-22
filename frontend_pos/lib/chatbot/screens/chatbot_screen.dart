import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:frontend_pos/chatbot/providers/chat_provider.dart';
import 'package:frontend_pos/chatbot/repositories/chatbot_repository.dart';
import 'package:frontend_pos/chatbot/widgets/chatbot_widget.dart';
import 'package:frontend_pos/core/http.dart';

class ChatbotScreen extends StatelessWidget {
  const ChatbotScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => ChatProvider(
        ChatbotRepository(ApiClient()),
      ),
      child: const ChatbotWidget(),
    );
  }
}