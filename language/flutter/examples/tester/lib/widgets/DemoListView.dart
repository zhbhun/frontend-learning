import 'package:flutter/material.dart';

class Demo {
  final String name;
  final bool link;
  final WidgetBuilder builder;

  const Demo({
    required this.name,
    this.link = true,
    required this.builder,
  });
}

class DemoListView extends StatelessWidget {
  final List<Demo> demos;

  const DemoListView({super.key, required this.demos});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemBuilder: (context, index) {
        var demo = demos[index];
        return ListTile(
          title: Text(demo.name),
          subtitle: demo.link ? null : demo.builder(context),
          onTap: demo.link
              ? () {
                  Navigator.push(context, MaterialPageRoute(builder: (context) {
                    return demo.builder(context);
                  }));
                }
              : null,
        );
      },
      itemCount: demos.length,
    );
  }
}
