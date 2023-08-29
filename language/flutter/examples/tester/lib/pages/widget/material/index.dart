import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import 'ProgressIndicatorTester.dart';

final List<Demo> demos = [
  ProgressIndicatorTester.demo,
];

class MaterialWidgetPage extends StatelessWidget {
  static final Demo demo = Demo(name: 'Material', builder: (BuildContext context) => MaterialWidgetPage());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Material"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
