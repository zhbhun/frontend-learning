/**
 * - 记录解构
 * - 模式匹配
 * - switch 表达式和模式匹配
 * - 封闭的类
 */

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:tester/widgets/index.dart';

class Dart3PatternApp extends StatefulWidget {
  static final Demo demo =
      Demo(name: 'Dart 3 Pattern', builder: (BuildContext context) => Dart3PatternApp());

  const Dart3PatternApp({
    Key? key,
  }) : super(key: key);

  @override
  State<Dart3PatternApp> createState() {
    return _Dart3PatternAppState();
  }
}

class _Dart3PatternAppState extends State<Dart3PatternApp> {
  late _Document document;

  @override
  void initState() {
    super.initState();

    document = _Document();
  }

  @override
  Widget build(BuildContext context) {
    return _DocumentScreen(document: document);
  }
}

class _DocumentScreen extends StatelessWidget {
  final _Document document;

  const _DocumentScreen({
    required this.document,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // 解构语法
    // var metadataRecord = document.getMetadata();
    var (title, modified: localModified) = document.getMetadata();
    var blocks = document.getBlocks();
    return Scaffold(
      appBar: AppBar(
        // title: Text(metadataRecord.$1),
        title: Text(title),
      ),
      body: Column(
        children: [
          // Text('Last modified ${metadataRecord.modified}'),
          Text('Last modified ${_formatDate(localModified)}'),
          Expanded(
            child: ListView.builder(
              itemCount: blocks.length,
              itemBuilder: (context, index) {
                return _BlockWidget(block: blocks[index]);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _BlockWidget extends StatelessWidget {
  final _Block block;

  const _BlockWidget({
    required this.block,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(8),
      child: switch (block) {
        _HeaderBlock(:var text) => Text(
            text,
            style: Theme.of(context).textTheme.displayMedium,
          ),
        _ParagraphBlock(:var text) => Text(text),
        _CheckboxBlock(:var text, :var isChecked) => Row(
            children: [
              Checkbox(value: isChecked, onChanged: (_) {}),
              Text(text),
            ],
          ),
      },
    );
  }
}

const _documentJson = '''
{
  "metadata": {
    "title": "My Document",
    "modified": "2023-05-10"
  },
  "blocks": [
    {
      "type": "h1",
      "text": "Chapter 1"
    },
    {
      "type": "p",
      "text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    },
    {
      "type": "checkbox",
      "checked": false,
      "text": "Learn Dart 3"
    }
  ]
}
''';

class _Document {
  final Map<String, Object?> _json;

  _Document() : _json = jsonDecode(_documentJson);

  (String, {DateTime modified}) getMetadata() {
    // 使用了模式匹配
    // if (_json.containsKey('metadata')) {
    //   var metadataJson = _json['metadata'];
    //   if (metadataJson is Map) {
    //     var title = metadataJson['title'] as String;
    //     var localModified = DateTime.parse(metadataJson['modified'] as String);
    //     return (title, modified: localModified);
    //   }
    // }
    // throw const FormatException('Unexpected JSON');
    if (_json
        case {
          'metadata': {
            'title': String title,
            'modified': String localModified,
          }
        }) {
      return (title, modified: DateTime.parse(localModified));
    } else {
      throw const FormatException('Unexpected JSON');
    }
  }

  List<_Block> getBlocks() {
    // 模式匹配数组
    if (_json case {'blocks': List blocksJson}) {
      return <_Block>[for (var blockJson in blocksJson) _Block.fromJson(blockJson)];
    } else {
      throw const FormatException('Unexpected JSON format');
    }
  }
}

sealed class _Block {
  _Block();

  factory _Block.fromJson(Map<String, Object?> json) {
    return switch (json) {
      {'type': 'h1', 'text': String text} => _HeaderBlock(text),
      {'type': 'p', 'text': String text} => _ParagraphBlock(text),
      {'type': 'checkbox', 'text': String text, 'checked': bool checked} =>
        _CheckboxBlock(text, checked),
      _ => throw const FormatException('Unexpected JSON format'),
    };
  }
}

class _HeaderBlock extends _Block {
  final String text;

  _HeaderBlock(this.text);
}

class _ParagraphBlock extends _Block {
  final String text;

  _ParagraphBlock(this.text);
}

class _CheckboxBlock extends _Block {
  final String text;
  final bool isChecked;

  _CheckboxBlock(this.text, this.isChecked);
}

String _formatDate(DateTime dateTime) {
  var today = DateTime.now();
  var difference = dateTime.difference(today);

  return switch (difference) {
    Duration(inDays: 0) => 'today',
    Duration(inDays: 1) => 'tomorrow',
    Duration(inDays: -1) => 'yesterday',
    Duration(inDays: var days) when days > 7 => '${days ~/ 7} weeks from now', // New
    Duration(inDays: var days) when days < -7 => '${days.abs() ~/ 7} weeks ago', // New
    Duration(inDays: var days, isNegative: true) => '${days.abs()} days ago',
    Duration(inDays: var days) => '$days days from now',
  };
}
