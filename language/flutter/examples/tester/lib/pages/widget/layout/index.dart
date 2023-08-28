import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import './CenterTester.dart';
import './ConstrainedBoxTester.dart';

final List<Demo> demos = [
  CenterTester.demo,
  ConstrainedBoxTester.demo,
];

class LayoutPage extends StatelessWidget {
  static final Demo demo = Demo(name: 'Layout', builder: (BuildContext context) => LayoutPage());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Layout"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
