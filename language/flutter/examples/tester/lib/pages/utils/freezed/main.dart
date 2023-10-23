import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';
import 'person.dart';

class FreezedTester extends StatelessWidget {
  static final Demo demo =
      Demo(name: 'Freezed', builder: (BuildContext context) => FreezedTester());

  @override
  Widget build(BuildContext context) {
    final personFromConstruct = Person(firstName: 'Hello', lastName: 'World!', age: 10);
    Map<String, Object?> json = {'firstName': 'Hello', 'lastName': 'world!', 'age': 100};
    final personFromJson = Person.fromJson(json);
    final personFromJson0 = personFromJson.copyWith(age: 0);
    print('toString: ${personFromJson.toString()}');
    print('toJson: ${personFromJson.toJson()}');
    return Scaffold(
        appBar: AppBar(
          title: Text("Freezed"),
        ),
        body: DemoListView(demos: [
          Demo(
            name: 'constructor',
            link: false,
            builder: (BuildContext context) => Text(personFromConstruct.toString()),
          ),
          Demo(
            name: 'fromJSON',
            link: false,
            builder: (BuildContext context) => Text(personFromJson0.toString()),
          ),
        ]));
  }
}
