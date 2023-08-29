import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import './lifecycle/index.dart';
import './layout/index.dart';
import './material/index.dart';

final List<Demo> demos = [
  LifecyclePage.demo,
  LayoutPage.demo,
  MaterialWidgetPage.demo,
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
