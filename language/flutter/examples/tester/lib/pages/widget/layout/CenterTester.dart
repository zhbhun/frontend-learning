import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';

class CenterTester extends StatelessWidget {
  static final Demo demo =
      Demo(name: 'Center', builder: (BuildContext context) => CenterTester());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text('Center'),
        ),
        body: Column(
          children: [
            Container(
              height: 100,
              color: Colors.green,
              child: Center(
                child: Container(color: Colors.red, child: Text('Hello World')),
              ),
            ),
            Container(
              color: Colors.blue,
              child: Center(
                widthFactor: 2,
                heightFactor: 2,
                child: Container(color: Colors.red, child: Text('Hello World')),
              ),
            ),
            Container(
              color: Colors.green,
              child: SizedBox(
                width: 200,
                height: 100,
                child: Center(
                  child:
                      Container(color: Colors.red, child: Text('Hello World')),
                ),
              ),
            ),
            Container(
              color: Colors.blue,
              child: SizedBox(
                width: 200,
                height: 100,
                child: Center(
                  widthFactor: 2,
                  heightFactor: 2,
                  child:
                      Container(color: Colors.red, child: Text('Hello World')),
                ),
              ),
            ),
          ],
        ));
  }
}
