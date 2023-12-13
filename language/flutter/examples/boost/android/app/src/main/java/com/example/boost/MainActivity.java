package com.example.boost;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

import com.idlefish.flutterboost.containers.FlutterBoostActivity;

import java.util.HashMap;
import java.util.Map;

import io.flutter.embedding.android.FlutterActivityLaunchConfigs;

public class MainActivity extends FlutterBoostActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Map<String, Object> map = new HashMap<String, Object>();
    // map.put("data", "Hello World!");
    // Intent intent = new FlutterBoostActivity.CachedEngineIntentBuilder(FlutterBoostActivity.class)
    //   .backgroundMode(FlutterActivityLaunchConfigs.BackgroundMode.opaque)
    //   .destroyEngineWithActivity(false)
    //   .url("/")
    //   // .urlParams(map)
    //   .build(this);
    // startActivity(intent);

    finish(); // 关闭当前 Activity（可选）
  }
}
