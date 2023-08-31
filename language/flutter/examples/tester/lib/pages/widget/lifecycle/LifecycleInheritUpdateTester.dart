/**
 * 1. didChangeDependencies
 * 2. build
 */
import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import 'LifecycleLogger.dart';

class FrogColor extends InheritedWidget {
  const FrogColor({
    super.key,
    required this.color,
    required super.child,
  });

  final Color color;

  static FrogColor? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<FrogColor>();
  }

  static FrogColor of(BuildContext context) {
    final FrogColor? result = maybeOf(context);
    assert(result != null, 'No FrogColor found in context');
    return result!;
  }

  @override
  bool updateShouldNotify(FrogColor oldWidget) => color != oldWidget.color;
}

class LifecycleInheritUpdateTester extends StatefulWidget {
  static final Demo demo = Demo(
      name: 'Inherit Update', builder: (BuildContext context) => LifecycleInheritUpdateTester());

  @override
  State<StatefulWidget> createState() {
    return _LifecycleParentUpdateTesterState();
  }
}

class _LifecycleParentUpdateTesterState extends State<LifecycleInheritUpdateTester> {
  Color color = Colors.green;
  var frog1 = LifecycleLogger(
      name: 'frog1',
      child: (BuildContext context) {
        return Text(
          'Frog1',
          style: TextStyle(color: FrogColor.of(context).color),
        );
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: _update,
          child: Text('Inherit Update'),
        ),
      ),
      body: SingleChildScrollView(
        child: FrogColor(
          color: color,
          child: Column(children: [
            frog1,
            LifecycleLogger(
              name: 'frog2',
            ),
            const LifecycleLogger(
              name: 'frog3',
            ),
            const _Frog4(),
            const _Frog5(),
          ]),
        ),
      ),
    );
  }

  _update() {
    setState(() {
      color = color == Colors.red ? Colors.green : Colors.red;
    });
  }
}

class _Frog4 extends StatelessWidget {
  const _Frog4();

  @override
  Widget build(BuildContext context) {
    print('>> frog4 build');
    return Text('frog4');
  }
}

class _Frog5 extends StatelessWidget {
  const _Frog5();

  @override
  Widget build(BuildContext context) {
    print('>> frog5 build');
    return Column(
      children: [
        Text('frog5', style: TextStyle(color: FrogColor.of(context).color)),
        _Frog6(),
      ],
    );
  }
}


class _Frog6 extends StatelessWidget {
  const _Frog6();

  @override
  Widget build(BuildContext context) {
    print('>> frog6 build');
    return Text('frog6');
  }
}
