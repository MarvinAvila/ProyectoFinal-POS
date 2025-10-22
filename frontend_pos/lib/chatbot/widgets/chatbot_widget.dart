import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:frontend_pos/chatbot/providers/chat_provider.dart';
import 'package:frontend_pos/chatbot/widgets/message_bubble.dart';
import 'package:frontend_pos/chatbot/widgets/message_input.dart';

class ChatbotWidget extends StatelessWidget {
  const ChatbotWidget({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🤖 Asistente Virtual POS'),
        backgroundColor: Colors.blue[700],
        actions: [
          IconButton(
            icon: const Icon(Icons.clear_all),
            onPressed: () => _showClearDialog(context),
            tooltip: 'Limpiar chat',
          ),
        ],
      ),
      body: const Column(
        children: [
          Expanded(child: _MessagesList()),
          MessageInput(),
        ],
      ),
    );
  }
  
  void _showClearDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Limpiar chat'),
        content: const Text('¿Estás seguro de que quieres eliminar todo el historial del chat?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () {
              context.read<ChatProvider>().clearChat();
              Navigator.pop(context);
            },
            child: const Text('Limpiar', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _MessagesList extends StatelessWidget {
  const _MessagesList({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final chatProvider = context.watch<ChatProvider>();
    
    return ListView.builder(
      reverse: true,
      padding: const EdgeInsets.all(8),
      itemCount: chatProvider.messages.length,
      itemBuilder: (context, index) {
        final message = chatProvider.messages.reversed.toList()[index];
        return MessageBubble(message: message);
      },
    );
  }
}