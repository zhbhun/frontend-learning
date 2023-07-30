import 'package:flutter/material.dart';

class ConstrainedBoxTester extends StatelessWidget {
  static const String routeTitle = 'ConstrainedBox';
  static const String routeName = '/widget/constrained-box-tester';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text('Center'),
        ),
        body: Column(
          children: [
            ConstrainedBox(
              constraints: const BoxConstraints(
                minWidth: 200, // 最小宽度
                maxWidth: 300, // 最大宽度
                minHeight: 100, // 最小高度
                maxHeight: 200, // 最大高度
              ),
              child: const Card(child: Text('Hello World!')),
            ),
            Container(
              width: 150,
              height: 50,
              child: ConstrainedBox(
                constraints: const BoxConstraints.expand(),
                child: const Card(child: Text('Hello World!')),
              ),
            )
          ],
        ));
  }
}
