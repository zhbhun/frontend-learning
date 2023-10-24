
import 'plugin_tester_platform_interface.dart';

class PluginTester {
  Future<String?> getPlatformVersion() {
    return PluginTesterPlatform.instance.getPlatformVersion();
  }
}
