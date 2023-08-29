/**
 * 初始化
 *
 * 1. initiate
 * 2. didChangeDependencies
 * 3. build
 */
import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';

class LifecycleParentUpdateTester extends StatefulWidget {
  static final Demo demo =
      Demo(name: 'Lifecycle Init', builder: (BuildContext context) => LifecycleParentUpdateTester());

  @override
  State<StatefulWidget> createState() {
    return _LifecycleParentUpdateTesterState();
  }
}

class _LifecycleParentUpdateTesterState extends State<LifecycleParentUpdateTester> {
  @override
  void initState() {
    super.initState();
    print('>> initState');
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    print('>> didChangeDependencies');
  }

  @override
  void didUpdateWidget(covariant LifecycleParentUpdateTester oldWidget) {
    super.didUpdateWidget(oldWidget);
    print('>> didUpdateWidget');
  }

  @override
  void activate() {
    super.activate();
    print('>> active');
  }

  @override
  void deactivate() {
    super.deactivate();
    print('>> deactivate');
  }

  @override
  void reassemble() {
    super.reassemble();
    print('>> reassemble');
  }

  @override
  void dispose() {
    super.dispose();
    print('>> dispose');
  }

  @override
  Widget build(BuildContext context) {
    print('>> build');
    return Scaffold(
      appBar: AppBar(
        title: Text('Lifecycle Init'),
      ),
    );
  }
}
