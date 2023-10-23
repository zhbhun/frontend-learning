import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import './widgets/index.dart';
import './pages/app/index.dart';
import './pages/widget/index.dart';
import './pages/utils/main.dart';

final List<Demo> demos = [AppPage.demo, WidgetPage.demo, UtilsTester.demo];

void main() {
  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      localeResolutionCallback: (locale, supportedLocales) {
        // 如果语言是英语
        // if (locale?.languageCode == 'en') {
        //   //注意大小写，返回美国英语
        //   return const Locale('en', 'US');
        // } else {
        //   return locale;
        // }
        // return Locale('zh', 'CN');
        return Locale('en', 'US');
      },
      localizationsDelegates: [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate
      ],
      supportedLocales: [
        Locale('en', 'US'), // 美国英语
        Locale('zh', 'CN'), // 中文简体
      ],
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
