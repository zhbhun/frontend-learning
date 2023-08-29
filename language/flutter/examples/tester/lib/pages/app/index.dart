import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import './Dart3PatternApp.dart';
import './LayoutTutorialApp.dart';
import './NamingApp.dart';
import './SignUpDemo.dart';
import './ShopperApp.dart';

final List<Demo> demos = [
  Dart3PatternApp.demo,
  LayoutTutorialApp.demo,
  NamingApp.demo,
  SignUpApp.demo,
  ShopperApp.demo,
];

class AppPage extends StatelessWidget {
  static final Demo demo = Demo(name: 'App', builder: (BuildContext context) => AppPage());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("App"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
