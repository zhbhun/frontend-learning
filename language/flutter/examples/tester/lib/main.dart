import 'package:flutter/material.dart';
import './pages/demo/Dart3PatternDemo.dart';
import './pages/demo/LayoutTutorial.dart';
import './pages/demo/SinUpDemo.dart';
import './pages/widget/ConstrainedBoxTester.dart';
import './pages/widget/CenterTester.dart';
import './pages/DemoPage.dart';
import './pages/NamingPage.dart';


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

final routeList = [
  WidgetRoute(
      name: ConstrainedBoxTester.routeName,
      title: ConstrainedBoxTester.routeTitle,
      builder: (context) => ConstrainedBoxTester()),
  WidgetRoute(
      name: CenterTester.routeName,
      title: CenterTester.routeTitle,
      builder: (context) => CenterTester()),
  WidgetRoute(
      name: DemoPage.routeName,
      title: DemoPage.routeTitle,
      builder: (context) => DemoPage()),
  WidgetRoute(
      name: NamingPage.routeName,
      title: NamingPage.routeTitle,
      builder: (context) => NamingPage()),
  WidgetRoute(
      name: LayoutTutorial.routeName,
      title: LayoutTutorial.routeTitle,
      builder: (context) => LayoutTutorial()),
  WidgetRoute(
      name: Dart3PatternDemo.routeName,
      title: Dart3PatternDemo.routeTitle,
      builder: (context) => Dart3PatternDemo()),
  WidgetRoute(
      name: SignUpDemo.routeName,
      title: SignUpDemo.routeTitle,
      builder: (context) => SignUpDemo()),
  WidgetRoute(
      name: SignUpWelcomeScreen.routeName,
      title: SignUpWelcomeScreen.routeTitle,
      builder: (context) => SignUpWelcomeScreen()),
];

final Map<String, WidgetBuilder> routeMap = {};

void main() {
  for (var route in routeList) {
    routeMap.addAll({route.name: route.builder});
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        // This is the theme of your application.
        //
        // TRY THIS: Try running your application with "flutter run". You'll see
        // the application has a blue toolbar. Then, without quitting the app,
        // try changing the seedColor in the colorScheme below to Colors.green
        // and then invoke "hot reload" (save your changes or press the "hot
        // reload" button in a Flutter-supported IDE, or press "r" if you used
        // the command line to start the app).
        //
        // Notice that the counter didn't reset back to zero; the application
        // state is not lost during the reload. To reset the state, use hot
        // restart instead.
        //
        // This works for code too, not just values: Most code changes can be
        // tested with just a hot reload.
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: '...'),
      routes: routeMap,
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // This widget is the home page of your application. It is stateful, meaning
  // that it has a State object (defined below) that contains fields that affect
  // how it looks.

  // This class is the configuration for the state. It holds the values (in this
  // case the title) provided by the parent (in this case the App widget) and
  // used by the build method of the State. Fields in a Widget subclass are
  // always marked "final".
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  Widget build(BuildContext context) {
    // This method is rerun every time setState is called, for instance as done
    // by the _incrementCounter method above.
    //
    // The Flutter framework has been optimized to make rerunning build methods
    // fast, so that you can just rebuild anything that needs updating rather
    // than having to individually change instances of widgets.
    return Scaffold(
      appBar: AppBar(
        // TRY THIS: Try changing the color here to a specific color (to
        // Colors.amber, perhaps?) and trigger a hot reload to see the AppBar
        // change color while the other colors stay the same.
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        // Here we take the value from the MyHomePage object that was created by
        // the App.build method, and use it to set our appbar title.
        title: Text(widget.title),
      ),
      body: ListView(
        children: [
          for (var route in routeList)
            ListTile(
              title: Text(route.title),
              onTap: () {
                Navigator.pushNamed(context, route.name);
              },
            ),
        ],
      ),
    );
  }
}
