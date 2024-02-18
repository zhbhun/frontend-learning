import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tester/widgets/index.dart';

class GoogleFontsPage extends StatelessWidget {
  static final Demo demo = Demo(
    name: 'Google Fonts',
    builder: (BuildContext context) => GoogleFontsPage(),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Google Fonts"),
      ),
      body: DemoListView(
        demos: [
          Demo(
            name: 'Caveat',
            link: false,
            builder: (context) => Text(
              'This is Google Fonts',
              style: GoogleFonts.caveat(),
            ),
          )
        ],
      ),
    );
  }
}
