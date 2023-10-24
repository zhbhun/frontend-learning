import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import 'plugin_tester_method_channel.dart';

abstract class PluginTesterPlatform extends PlatformInterface {
  /// Constructs a PluginTesterPlatform.
  PluginTesterPlatform() : super(token: _token);

  static final Object _token = Object();

  static PluginTesterPlatform _instance = MethodChannelPluginTester();

  /// The default instance of [PluginTesterPlatform] to use.
  ///
  /// Defaults to [MethodChannelPluginTester].
  static PluginTesterPlatform get instance => _instance;

  /// Platform-specific implementations should set this with their own
  /// platform-specific class that extends [PluginTesterPlatform] when
  /// they register themselves.
  static set instance(PluginTesterPlatform instance) {
    PlatformInterface.verifyToken(instance, _token);
    _instance = instance;
  }

  Future<String?> getPlatformVersion() {
    throw UnimplementedError('platformVersion() has not been implemented.');
  }
}
