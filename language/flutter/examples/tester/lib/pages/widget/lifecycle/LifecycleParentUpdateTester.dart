/**
 * 初始化
 *
 * 1. didUpdateWidget
 * 2. build
 *
 * ps：只有 widget 重新构建的才会触发，像 child2 在父组件更新状态时，是不会重新构建的
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
  var logger = LifecycleLogger(
    name: 'logger2',
    child: (BuildContext context) => Text('Logger 2'),
  );

  @override
  Widget build(BuildContext context) {
    print('>> rebuild');
    return Scaffold(
      appBar: AppBar(
        title: Text('Parent Update'),
      ),
      body: Column(
        children: [
          GestureDetector(
            onTap: _update,
            child: LifecycleLogger(
              name: 'logger1',
              child: (BuildContext context) => Text('Logger 1'),
            ),
          ),
          logger,
          const LifecycleLogger(
            name: 'logger3',
          ),
        ],
      ),
    );
  }

  _update() {
    setState(() {});
  }
}
