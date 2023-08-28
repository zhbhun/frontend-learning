import 'package:flutter/material.dart';
import './widgets/index.dart';
import './pages/app/index.dart';
import './pages/widget/index.dart';

class WidgetRoute {
  const WidgetRoute({
    required this.name,
    required this.title,
    required this.builder,
  });

  final String name;
  final String title;
  final WidgetBuilder builder;
}

final List<Demo> demos = [AppPage.demo, WidgetPage.demo];

void main() {
  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        useMaterial3: true,
      ),
      home: const HomePage(title: 'Flutter'),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.title});
  final String title;

  @override
  State<HomePage> createState() => HomePageState();
}

class HomePageState extends State<HomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: DemoListView(demos: demos),
    );
  }
}
