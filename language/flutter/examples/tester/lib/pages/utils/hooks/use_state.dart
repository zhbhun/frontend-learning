import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:tester/widgets/index.dart';

class UseStateTester extends StatelessWidget {
  static final Demo demo =
      Demo(name: 'useState<T>', builder: (BuildContext context) => UseStateTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('useState<T>')),
      body: DemoListView(
        demos: [
          Demo(
            name: 'Int',
            link: false,
            builder: (BuildContext context) => _IntTester(),
          ),
          Demo(
            name: 'Object1',
            link: false,
            builder: (BuildContext context) => _Object1Tester(),
          ),
          Demo(
            name: 'Object2',
            link: false,
            builder: (BuildContext context) => _Object2Tester(),
          ),
          Demo(
            name: 'Object3',
            link: false,
            builder: (BuildContext context) => _Object3Tester(),
          ),
        ],
      ),
    );
  }
}

class _IntTester extends HookWidget {
  @override
  Widget build(BuildContext context) {
    final counter = useState(0);

    (String, {int modified}) x = ('', modified: 1);
    print(x == x);

    return Column(children: [
      GestureDetector(
        // automatically triggers a rebuild of the Counter widget
        onTap: () => counter.value++,
        child: Text(counter.value.toString()),
      ),
      _Child(),
    ]);
  }
}

class _Child extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    print('child');
    return Text('child');
  }
}

class _Counter {
  late int value;

  _Counter(this.value);

  increase() {
    value += 1;
  }
}

class _Object1Tester extends HookWidget {
  @override
  Widget build(BuildContext context) {
    final refresh = useState(0);
    final counter = useMemoized(() => _Counter(0));

    (String, {int modified}) x = ('', modified: 1);
    print(x == x);

    return Column(children: [
      GestureDetector(
        // automatically triggers a rebuild of the Counter widget
        onTap: () {
          counter.increase();
          refresh.value++;
        },
        child: Text(counter.value.toString()),
      ),
    ]);
  }
}

(T, void Function(T Function(T value))) useObject<T extends Object>(T Function() valueBuilder) {
  final value = useMemoized(valueBuilder);
  final state = useState([value]);
  void setState(T Function(T value) update) {
    state.value = [update(value)];
  }

  return (value, setState);
}

class _Object2Tester extends HookWidget {
  @override
  Widget build(BuildContext context) {
    final (counter, setCounter) = useObject(() => _Counter(0));

    (String, {int modified}) x = ('', modified: 1);
    print(x == x);

    return Column(children: [
      GestureDetector(
        // automatically triggers a rebuild of the Counter widget
        onTap: () {
          setCounter((counter) {
            counter.value += 1;
            return counter;
          });
        },
        child: Text(counter.value.toString()),
      ),
    ]);
  }
}

(T Function(), void Function(T Function(T value))) useSignal<T extends Object>(
    T Function() valueBuilder) {
  final value = useMemoized(valueBuilder);
  final state = useState(() => value);
  final getter = useMemoized(() => () => state.value());
  final setter = useMemoized(() => ((T Function(T value) update) {
        final newValue = update(getter());
        state.value = () => newValue;
      }));

  return (getter, setter);
}

class _Object3Tester extends HookWidget {
  @override
  Widget build(BuildContext context) {
    final (getCounter, setCounter) = useSignal(() => _Counter(0));

    (String, {int modified}) x = ('', modified: 1);
    print(x == x);

    return Column(children: [
      GestureDetector(
        // automatically triggers a rebuild of the Counter widget
        onTap: () {
          setCounter((counter) {
            counter.value += 1;
            return counter;
          });
        },
        child: Text(getCounter().value.toString()),
      ),
    ]);
  }
}
