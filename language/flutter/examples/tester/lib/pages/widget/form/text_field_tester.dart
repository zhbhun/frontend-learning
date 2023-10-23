import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';

class TextFieldTester extends StatelessWidget {
  static final Demo demo = Demo(name: 'TextField', builder: (BuildContext context) => TextFieldTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text('TextField'),
        ),
        body: Column(
          children: [
            Container(
              height: 100,
              color: Colors.green,
              child: TextField(
                obscureText: false,
                decoration: InputDecoration(
                  border: OutlineInputBorder(),
                  labelText: 'Password',
                ),
              ),
            ),
          ],
        ));
  }
}
