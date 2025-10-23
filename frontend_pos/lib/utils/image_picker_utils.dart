// lib/utils/image_picker_utils.dart
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

class ImagePickerUtils {
  static final ImagePicker _picker = ImagePicker();

  /// Selecciona imagen de manera multiplataforma
  static Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
  }) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        imageQuality: imageQuality ?? 80,
      );
      return image;
    } catch (e) {
      if (kDebugMode) {
        print('Error picking image: $e');
      }
      return null;
    }
  }

  /// Convierte XFile a bytes (funciona en web y móvil)
  static Future<Uint8List?> fileToBytes(XFile file) async {
    try {
      return await file.readAsBytes();
    } catch (e) {
      if (kDebugMode) {
        print('Error reading file: $e');
      }
      return null;
    }
  }

  /// Para web: maneja File/Blob, para móvil: File normal
  static Future<Uint8List?> convertToBytes(dynamic file) async {
    if (file is XFile) {
      return await fileToBytes(file);
    } else if (file is File) {
      return await file.readAsBytes();
    }
    return null;
  }
}