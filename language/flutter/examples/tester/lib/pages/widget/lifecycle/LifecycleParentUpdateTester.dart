/**
 * 初始化
 *
 * 1. didUpdateWidget
 * 2. build
 */
import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import 'LifecycleLogger.dart';

class LifecycleParentUpdateTester extends StatefulWidget {
  static final Demo demo =
      Demo(name: 'Parent Update', builder: (BuildContext context) => LifecycleParentUpdateTester());

  @override
  State<StatefulWidget> createState() {
    return _LifecycleParentUpdateTesterState();
  }
}

class _LifecycleParentUpdateTesterState extends State<LifecycleParentUpdateTester> {
  @override
  Widget build(BuildContext context) {
    return LifecycleLogger(
        name: 'Parent Update',
        child: Scaffold(
          appBar: AppBar(
            title: GestureDetector(
              onTap: _update,
              child: Text('Parent Update'),
            ),
          ),
        ));
  }

  _update() {
    setState(() {});
  }
}
