import 'package:flutter/material.dart';
import 'DemoListView.dart';

class DemoGroup {
  final String name;
  final List<Demo> demos;

  const DemoGroup({
    required this.name,
    required this.demos,
  });
}

class DemoGroupView extends StatelessWidget {
  final List<DemoGroup> groups;

  const DemoGroupView({super.key, required this.groups});

  @override
  Widget build(BuildContext context) {
    int totalCount = groups.fold(0, (int rcc, DemoGroup group) {
      return rcc + group.demos.length;
    });
    var groupMap = <int, String>{};
    var demoMap = <int, Demo>{};
    for (var index = 0, groupIndex = 0, demoIndex = 0; index < groups.length; index++) {
      var group = groups[index];
      groupMap[groupIndex] = group.name;
      groupIndex += group.demos.length;
      for (var groupDemoIndex = 0;
          groupDemoIndex < group.demos.length;
          groupDemoIndex++, demoIndex++) {
        demoMap[demoIndex] = group.demos[groupDemoIndex];
      }
    }
    return ListView.separated(
      itemBuilder: (context, index) {
        var demo = demoMap[index];
        if (demo == null) {
          return SizedBox.shrink();
        }
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
      itemCount: totalCount,
      separatorBuilder: (BuildContext context, int index) {
        var groupName = groupMap[index];
        if (groupName != null) {
          Text(groupName);
        }
        return SizedBox.shrink();
      },
    );
  }
}
