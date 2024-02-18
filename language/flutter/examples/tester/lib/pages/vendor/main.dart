import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';

import 'google_fonts/main.dart';
import 'image_picker/main.dart';

final List<Demo> demos = [
  GoogleFontsPage.demo,
  ImagePickerPage.demo,
];

class VendorPage extends StatelessWidget {
  static final Demo demo = Demo(
    name: 'Vendor',
    builder: (BuildContext context) => VendorPage(),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("Vendor"),
        ),
        body: DemoListView(
          demos: demos,
        ));
  }
}
