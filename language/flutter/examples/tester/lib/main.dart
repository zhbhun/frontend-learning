import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'generated/l10n.dart';
import 'widgets/index.dart';
import 'pages/app/index.dart';
import 'pages/widget/index.dart';
import 'pages/utils/main.dart';

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
        // return Locale('en');
        return Locale('zh');
      },
      localizationsDelegates: [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        S.delegate,
      ],
      supportedLocales: S.delegate.supportedLocales,
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
