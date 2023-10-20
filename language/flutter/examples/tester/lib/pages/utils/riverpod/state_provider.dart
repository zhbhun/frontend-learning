import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:tester/widgets/index.dart';

class StateProviderTester extends StatelessWidget {
  static final Demo demo =
      Demo(name: 'StateProvider', builder: (BuildContext context) => StateProviderTester());

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
        child: Scaffold(
      appBar: AppBar(title: Text('StateProvider')),
      body: DemoListView(
        demos: [
          Demo(
            name: 'Counter1',
            link: false,
            builder: (BuildContext context) => _CounterWidget(),
          ),
          Demo(
            name: 'Counter2',
            link: false,
            builder: (BuildContext context) => _CounterWidget(),
          ),
        ],
      ),
    ));
  }
}

final _countProvider = StateProvider((ref) => 0);

class _CounterWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(_countProvider);
    return GestureDetector(
      child: Text('$count'),
      onTap: () {
        ref.read(_countProvider.notifier).state += 1;
      },
    );
  }
}
