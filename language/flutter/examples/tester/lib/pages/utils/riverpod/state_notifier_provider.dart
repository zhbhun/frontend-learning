import 'dart:async';

import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:tester/widgets/index.dart';

class StateNotifierProviderTester extends StatelessWidget {
  static final Demo demo = Demo(
      name: 'StateNotifierProvider',
      builder: (BuildContext context) => StateNotifierProviderTester());

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
        child: Scaffold(
      appBar: AppBar(title: Text('StateNotifierProvider')),
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

class _Counter extends StateNotifier<int> {
  _Counter() : super(0);

  void increment() => state++;
}

final _counterProvider = StateNotifierProvider<_Counter, int>((ref) {
  return _Counter();
});


class _CounterWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(_counterProvider);
    return GestureDetector(
      child: Text('$count'),
      onTap: () {
        ref.read(_counterProvider.notifier).increment();
      },
    );
  }
}
