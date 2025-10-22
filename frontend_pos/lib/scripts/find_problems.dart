import 'dart:io';

void main() {
  print('🔍 BUSCANDO ARCHIVOS CON URLs HARCODEADAS EN WINDOWS...\n');
  
  final projectDir = Directory('lib');
  final problematicPatterns = [
    'http.get(',
    'http.post(',
    'HttpClient',
    ':3000',
    'localhost:3000',
    '127.0.0.1:3000',
    '/api/',
  ];
  
  int problemCount = 0;
  List<String> problematicFiles = [];
  
  // Recorrer todos los archivos .dart en lib
  projectDir.listSync(recursive: true).forEach((entity) {
    if (entity is File && entity.path.endsWith('.dart')) {
      try {
        final content = entity.readAsStringSync();
        
        for (var pattern in problematicPatterns) {
          if (content.contains(pattern)) {
            if (!problematicFiles.contains(entity.path)) {
              problematicFiles.add(entity.path);
              print('❌ PROBLEMA EN: ${entity.path}');
              print('   Patrón encontrado: "$pattern"');
              
              // Mostrar línea específica donde aparece
              final lines = content.split('\n');
              for (int i = 0; i < lines.length; i++) {
                if (lines[i].contains(pattern)) {
                  print('   Línea ${i + 1}: ${lines[i].trim()}');
                }
              }
              print('   ---');
              problemCount++;
            }
            break;
          }
        }
      } catch (e) {
        // Ignorar archivos que no se pueden leer
      }
    }
  });
  
  if (problemCount == 0) {
    print('✅ No se encontraron archivos con URLs hardcodeadas');
  } else {
    print('\n🎯 RESUMEN: Se encontraron $problemCount archivos problemáticos');
    print('   Estos archivos necesitan usar ApiClient()');
  }
}