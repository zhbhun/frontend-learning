import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import 'text_field_tester.dart';

final List<Demo> demos = [
  TextFieldTester.demo,
];

class FormPage extends StatelessWidget {
  static final Demo demo = Demo(name: 'Form', builder: (BuildContext context) => FormPage());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Form"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
