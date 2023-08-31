import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:tester/widgets/index.dart';

class UseListenableTester extends StatelessWidget {
  static final Demo demo = Demo(
      name: 'useListenable<T extends Listenable?> ',
      builder: (BuildContext context) => UseListenableTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('useListenable<T extends Listenable?>')),
      body: DemoListView(
        demos: [
          Demo(
            name: 'Counter',
            link: false,
            builder: (BuildContext context) => _Demo(),
          ),
        ],
      ),
    );
  }
}

class _Counter extends ChangeNotifier {
  late int value;

  _Counter(this.value);

  increase() {
    value += 1;
    notifyListeners();
  }
}

class _Demo extends HookWidget {
  @override
  Widget build(BuildContext context) {
    final counter = useListenable(useMemoized(() => _Counter(0)));

    return GestureDetector(
      // automatically triggers a rebuild of the Counter widget
      onTap: counter.increase,
      child: Text(counter.value.toString()),
    );
  }
}
