import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import './LifecycleInitTester.dart';
import './LifecycleParentUpdateTester.dart';
import './LifecycleInheritUpdateTester.dart';

final List<Demo> demos = [
  LifecycleInitTester.demo,
  LifecycleParentUpdateTester.demo,
  LifecycleInheritUpdateTester.demo,
];

class LifecyclePage extends StatelessWidget {
  static final Demo demo = Demo(name: 'Lifecycle', builder: (BuildContext context) => LifecyclePage());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Lifecycle"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
