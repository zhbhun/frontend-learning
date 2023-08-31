import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import './state_provider.dart';
import './state_notifier_provider.dart';

final List<Demo> demos = [
  StateProviderTester.demo,
  StateNotifierProviderTester.demo,
];

class RiverpodTester extends StatelessWidget {
  static final Demo demo = Demo(name: 'Riverpod', builder: (BuildContext context) => RiverpodTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Riverpod"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
