import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import 'convert/main.dart';
import 'freezed/main.dart';
import 'hooks/main.dart';
import 'intl/main.dart';
import 'riverpod/main.dart';

final List<Demo> demos = [
  ConvertTester.demo,
  FreezedTester.demo,
  HooksTester.demo,
  IntlTester.demo,
  RiverpodTester.demo,
];

class UtilsTester extends StatelessWidget {
  static final Demo demo = Demo(name: 'Utils', builder: (BuildContext context) => UtilsTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Utils"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
