import 'package:flutter/material.dart';

class LifecycleLogger extends StatefulWidget {
  final String name;
  final WidgetBuilder? child;

  const LifecycleLogger({
    Key? key,
    required this.name,
    this.child,
  }) : super(key: key);

  @override
  State<StatefulWidget> createState() {
    return _LifecycleLoggerState();
  }
}

class _LifecycleLoggerState extends State<LifecycleLogger> {
  @override
  void initState() {
    super.initState();
    print('>> ${widget.name} initState');
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    print('>> ${widget.name} didChangeDependencies');
  }

  @override
  void didUpdateWidget(covariant LifecycleLogger oldWidget) {
    super.didUpdateWidget(oldWidget);
    print('>> ${widget.name} didUpdateWidget');
  }

  @override
  void activate() {
    super.activate();
    print('>> ${widget.name} active');
  }

  @override
  void deactivate() {
    super.deactivate();
    print('>> ${widget.name} deactivate');
  }

  @override
  void reassemble() {
    super.reassemble();
    print('>> ${widget.name} reassemble');
  }

  @override
  void dispose() {
    super.dispose();
    print('>> ${widget.name} dispose');
  }

  @override
  Widget build(BuildContext context) {
    print('>> ${widget.name} build');
    return widget.child != null ? widget.child!(context) : Placeholder();
  }
}
