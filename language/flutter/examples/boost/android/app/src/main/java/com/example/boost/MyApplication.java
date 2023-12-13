package com.example.boost;

import android.content.Intent;
import android.content.pm.ApplicationInfo;

import com.idlefish.flutterboost.*;
import com.idlefish.flutterboost.containers.FlutterBoostActivity;

import java.util.Objects;

import io.flutter.embedding.android.FlutterActivityLaunchConfigs;
import io.flutter.app.FlutterApplication;

public class MyApplication extends FlutterApplication {
  @Override
  public void onCreate() {
    super.onCreate();

    FlutterBoost.instance().setup(this, new FlutterBoostDelegate() {
      @Override
      public void pushNativeRoute(FlutterBoostRouteOptions options) {
        if (Objects.equals(options.pageName(), "/album")) {
          Intent intent = new Intent(FlutterBoost.instance().currentActivity(), AlbumActivity.class);
          FlutterBoost.instance().currentActivity().startActivityForResult(intent, options.requestCode());
        } else if (Objects.equals(options.pageName(), "/paper/camera")) {
          Intent intent = new Intent(FlutterBoost.instance().currentActivity(), PaperCameraActivity.class);
          FlutterBoost.instance().currentActivity().startActivityForResult(intent, options.requestCode());
        }
        // TODO: ...
      }

      @Override
      public void pushFlutterRoute(FlutterBoostRouteOptions options) {
        Intent intent = new FlutterBoostActivity.CachedEngineIntentBuilder(FlutterBoostActivity.class)
          .backgroundMode(FlutterActivityLaunchConfigs.BackgroundMode.opaque)
          .destroyEngineWithActivity(false)
          .uniqueId(options.uniqueId())
          .url(options.pageName())
          .urlParams(options.arguments())
          .build(FlutterBoost.instance().currentActivity());
        FlutterBoost.instance().currentActivity().startActivity(intent);
      }
    }, engine -> {
    }, new FlutterBoostSetupOptions.Builder()
      .isDebugLoggingEnabled((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0)
      .build());
  }
}
