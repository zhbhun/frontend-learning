/**
 * 初始化
 *
 * 1. initiate
 * 2. didChangeDependencies
 * 3. build
 */
import 'package:flutter/material.dart';
import 'package:tester/pages/widget/lifecycle/LifecycleLogger.dart';
import 'package:tester/widgets/index.dart';
import './LifecycleLogger.dart';

class LifecycleInitTester extends StatelessWidget {
  static final Demo demo =
      Demo(name: 'Lifecycle Init', builder: (BuildContext context) => LifecycleInitTester());

  @override
  Widget build(BuildContext context) {
    // TODO: implement build
    // throw UnimplementedError();
    return LifecycleLogger(
        name: 'init',
        child: Scaffold(
          appBar: AppBar(
            title: Text('Lifecycle Init'),
          ),
        ));
  }
}
