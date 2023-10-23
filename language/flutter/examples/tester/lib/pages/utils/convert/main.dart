import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';

class ConvertTester extends StatelessWidget {
  static final Demo demo =
      Demo(name: 'Convert', builder: (BuildContext context) => ConvertTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Convert"),
        ),
        body: DemoListView(demos: [
          Demo(
            name: 'constructor',
            link: false,
            builder: (BuildContext context) {
              var encoded = json.encode([
                1,
                2,
                {"a": null}
              ]);
              var decoded = json.decode('["foo", { "bar": 499 }]');
              return Text('$encoded ${decoded[0]}');
            },
          ),
        ]));
  }
}
