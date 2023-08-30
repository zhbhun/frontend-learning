/**
 * 初始化
 *
 * 1. initiate
 * 2. didChangeDependencies
 * 3. build
 */
import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import 'LifecycleLogger.dart';

class LifecycleInitTester extends StatelessWidget {
  static final Demo demo =
      Demo(name: 'Init', builder: (BuildContext context) => LifecycleInitTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text('Lifecycle Init'),
        ),
        body: LifecycleLogger(
          name: 'logger',
        ));
  }
}
