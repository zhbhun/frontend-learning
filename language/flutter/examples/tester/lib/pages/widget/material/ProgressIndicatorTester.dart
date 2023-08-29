import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';

class ProgressIndicatorTester extends StatelessWidget {
  static final Demo demo =
      Demo(name: 'ProgressIndicator', builder: (BuildContext context) => ProgressIndicatorTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('ProgressIndicator'),
      ),
      body: DemoGroupView(groups: [
        DemoGroup(name: 'LinearProgressIndicator', demos: [
          Demo(
              name: 'Color',
              link: false,
              builder: (BuildContext context) => LinearProgressIndicator(
                    value: 0.5,
                    backgroundColor: Colors.red,
                    color: Colors.blue,
                  )),
          Demo(
              name: 'Demo',
              link: false,
              builder: (BuildContext context) => _LinearProgressIndicatorDemo())
        ])
      ]),
    );
  }
}

class _LinearProgressIndicatorDemo extends StatefulWidget {
  const _LinearProgressIndicatorDemo({super.key});

  @override
  State<_LinearProgressIndicatorDemo> createState() => _LinearProgressIndicatorDemoState();
}

class _LinearProgressIndicatorDemoState extends State<_LinearProgressIndicatorDemo>
    with TickerProviderStateMixin {
  late AnimationController controller;

  @override
  void initState() {
    controller = AnimationController(
      /// [AnimationController]s can be created with `vsync: this` because of
      /// [TickerProviderStateMixin].
      vsync: this,
      duration: const Duration(seconds: 5),
    )..addListener(() {
        setState(() {});
      });
    controller.repeat(reverse: true);
    super.initState();
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: <Widget>[
          const Text(
            'Linear progress indicator with a fixed color',
            style: TextStyle(fontSize: 20),
          ),
          LinearProgressIndicator(
            value: controller.value,
            semanticsLabel: 'Linear progress indicator',
          ),
        ],
      ),
    );
  }
}
