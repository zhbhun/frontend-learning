import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'plugin_tester_platform_interface.dart';

/// An implementation of [PluginTesterPlatform] that uses method channels.
class MethodChannelPluginTester extends PluginTesterPlatform {
  /// The method channel used to interact with the native platform.
  @visibleForTesting
  final methodChannel = const MethodChannel('plugin_tester');

  @override
  Future<String?> getPlatformVersion() async {
    final version = await methodChannel.invokeMethod<String>('getPlatformVersion');
    return version;
  }
}
