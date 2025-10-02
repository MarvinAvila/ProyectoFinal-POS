// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:frontend_pos/main.dart'; // aquí está PosApp

void main() {
  testWidgets('La app POS construye y muestra el shell', (
    WidgetTester tester,
  ) async {
    // Monta la app real
    await tester.pumpWidget(const PosApp());

    // La app debería contener un MaterialApp
    expect(find.byType(MaterialApp), findsOneWidget);

    // Y el shell inicial (Dashboard) debería renderizar algún texto.
    // Aunque falle la red, el título 'Dashboard' existe en la UI.
    expect(find.text('Dashboard'), findsWidgets);
  });
}
