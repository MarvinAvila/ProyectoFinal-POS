import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:frontend_pos/chatbot/providers/chat_provider.dart';

class MessageInput extends StatefulWidget {
  const MessageInput({Key? key}) : super(key: key);
  
  @override
  State<MessageInput> createState() => _MessageInputState();
}

class _MessageInputState extends State<MessageInput> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  
  @override
  Widget build(BuildContext context) {
    final chatProvider = context.watch<ChatProvider>();
    
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[300]!)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              focusNode: _focusNode,
              decoration: InputDecoration(
                hintText: 'Escribe tu pregunta...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16, 
                  vertical: 12
                ),
              ),
              onSubmitted: (text) => _sendMessage(context, text),
            ),
          ),
          const SizedBox(width: 8),
          if (chatProvider.isLoading)
            const CircularProgressIndicator()
          else
            IconButton(
              icon: const Icon(Icons.send, color: Colors.blue),
              onPressed: () => _sendMessage(context, _controller.text),
            ),
        ],
      ),
    );
  }
  
  void _sendMessage(BuildContext context, String text) {
    if (text.trim().isEmpty) return;
    
    final chatProvider = context.read<ChatProvider>();
    chatProvider.sendMessage(text.trim());
    _controller.clear();
    _focusNode.requestFocus();
  }
  
  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }
}