import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:tester/widgets/index.dart';

class WidgetProps {
  final Key? key;

  const WidgetProps({this.key});
}

class HookBuilder<T extends WidgetProps> extends HookWidget {
  const HookBuilder({
    required this.props,
    required this.builder,
    Key? key,
  }) : super(key: key);

  final T props;
  final Widget Function(T props, BuildContext context) builder;

  @override
  Widget build(BuildContext context) => builder(props, context);
}

Widget Function([T? props]) createWidget<T extends WidgetProps>(
    Widget Function(T props, BuildContext context) builder, T defaultProps) {
  return ([T? props]) {
    return HookBuilder<T>(
        key: props?.key ?? defaultProps.key, props: props ?? defaultProps, builder: builder);
  };
}

class _CounterProps extends WidgetProps {
  final int defaultValue;

  const _CounterProps({super.key, this.defaultValue = 0});
}

final _counter = createWidget<_CounterProps>((props, context) {
  final counter = useState(props.defaultValue ?? 0);
  return Column(children: [
    GestureDetector(
      onTap: () => counter.value++,
      child: Text(counter.value.toString()),
    ),
  ]);
}, _CounterProps());

class _AdvancedCounterProps extends _CounterProps {
  final int step;

  _AdvancedCounterProps({
    super.key,
    super.defaultValue,
    this.step = 1,
  });
}

final _advancedCounter = createWidget<_AdvancedCounterProps>((props, context) {
  final counter = useState(props.defaultValue ?? 0);

  return Column(children: [
    GestureDetector(
      // automatically triggers a rebuild of the Counter widget
      onTap: () {
        counter.value += props.step ?? 1;
      },
      child: Text(counter.value.toString()),
    ),
  ]);
}, _AdvancedCounterProps());

class HookConsumerBuilder<T extends WidgetProps> extends HookConsumerWidget {
  const HookConsumerBuilder({
    required this.props,
    required this.builder,
  });

  final T props;
  final Widget Function(T props, BuildContext context) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return builder(props, context);
  }
}

Widget Function([T? props]) createConsumerWidget<T extends WidgetProps>(
    Widget Function(T props, BuildContext context) builder, T defaultProps) {
  return ([T? props]) {
    return HookConsumerBuilder<T>(props: props ?? defaultProps, builder: builder);
  };
}

WidgetRef useWidgetRef() => useContext() as WidgetRef;
final _countProvider = StateProvider((ref) => 0);
final _globalCounter = createConsumerWidget<_CounterProps>((props, context) {
  final ref = useWidgetRef();
  final count = ref.watch(_countProvider);
  return Column(children: [
    GestureDetector(
      child: Text(count.toString()),
      onTap: () {
        ref.read(_countProvider.notifier).state += 1;
      },
    ),
  ]);
}, _CounterProps());

class UseFuncWidgetTester extends StatelessWidget {
  static final Demo demo =
      Demo(name: 'UseFuncWidgetTester', builder: (BuildContext context) => UseFuncWidgetTester());

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: Scaffold(
        appBar: AppBar(title: Text('UseFuncWidgetTester')),
        body: DemoListView(
          demos: [
            Demo(
              name: 'Counter1',
              link: false,
              builder: (BuildContext context) => _counter(),
            ),
            Demo(
              name: 'Counter2',
              link: false,
              builder: (BuildContext context) => _counter(_CounterProps(defaultValue: 100)),
            ),
            Demo(
              name: 'Advanced Counter',
              link: false,
              builder: (BuildContext context) => _advancedCounter(),
            ),
            Demo(
              name: 'Advanced Counter(defaultValue: 100)',
              link: false,
              builder: (BuildContext context) =>
                  _advancedCounter(_AdvancedCounterProps(defaultValue: 100)),
            ),
            Demo(
              name: 'Advanced Counter(defaultValue: 100, step: 10)',
              link: false,
              builder: (BuildContext context) =>
                  _advancedCounter(_AdvancedCounterProps(defaultValue: 100, step: 10)),
            ),
            Demo(
              name: 'Glonal Counter 1',
              link: false,
              builder: (BuildContext context) => _globalCounter(),
            ),
            Demo(
              name: 'Glonal Counter 2',
              link: false,
              builder: (BuildContext context) => _globalCounter(),
            ),
          ],
        ),
      ),
    );
  }
}
