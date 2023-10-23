import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import 'package:tester/generated/l10n.dart';

class IntlTester extends StatelessWidget {
  static final Demo demo = Demo(name: 'Intl', builder: (BuildContext context) => IntlTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Intl"),
        ),
        body: DemoListView(demos: [
          Demo(
            name: 'greet',
            link: false,
            builder: (BuildContext context) => Text(S.of(context).greet),
          ),
        ]));
  }
}
