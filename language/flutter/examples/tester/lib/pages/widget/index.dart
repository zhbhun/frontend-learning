import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import './layout/index.dart';

final List<Demo> demos = [
  LayoutPage.demo,
];

class WidgetPage extends StatelessWidget {
  static final Demo demo = Demo(name: 'Widget', builder: (BuildContext context) => WidgetPage());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Widget"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
