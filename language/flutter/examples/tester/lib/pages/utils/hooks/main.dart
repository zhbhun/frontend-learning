import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import 'use_state.dart';
import 'use_listenable.dart';
import 'use_func_widget.dart';

final List<Demo> demos = [
  UseStateTester.demo,
  UseListenableTester.demo,
  UseFuncWidgetTester.demo,
];

class HooksTester extends StatelessWidget {
  static final Demo demo = Demo(name: 'Hooks', builder: (BuildContext context) => HooksTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Hooks"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
