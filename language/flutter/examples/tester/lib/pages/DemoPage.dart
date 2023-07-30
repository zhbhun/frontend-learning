import 'package:flutter/material.dart';

class DemoPage extends StatelessWidget {
  static const String routeTitle = 'Demo';
  static const String routeName = '/demo';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Second Page'),
      ),
      body: Center(
        child: Text('Hello World'),
      ),
    );
  }
}
