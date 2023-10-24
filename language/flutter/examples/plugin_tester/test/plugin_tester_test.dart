import 'package:flutter_test/flutter_test.dart';
import 'package:plugin_tester/plugin_tester.dart';
import 'package:plugin_tester/plugin_tester_platform_interface.dart';
import 'package:plugin_tester/plugin_tester_method_channel.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

class MockPluginTesterPlatform
    with MockPlatformInterfaceMixin
    implements PluginTesterPlatform {

  @override
  Future<String?> getPlatformVersion() => Future.value('42');
}

void main() {
  final PluginTesterPlatform initialPlatform = PluginTesterPlatform.instance;

  test('$MethodChannelPluginTester is the default instance', () {
    expect(initialPlatform, isInstanceOf<MethodChannelPluginTester>());
  });

  test('getPlatformVersion', () async {
    PluginTester pluginTesterPlugin = PluginTester();
    MockPluginTesterPlatform fakePlatform = MockPluginTesterPlatform();
    PluginTesterPlatform.instance = fakePlatform;

    expect(await pluginTesterPlugin.getPlatformVersion(), '42');
  });
}
