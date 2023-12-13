package com.example.boost;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

import com.idlefish.flutterboost.containers.FlutterBoostActivity;

import java.util.HashMap;
import java.util.Map;

import io.flutter.embedding.android.FlutterActivityLaunchConfigs;

public class PaperCameraActivity extends Activity implements View.OnClickListener {

  private TextView next;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    setContentView(R.layout.paper_camera);

    next = findViewById(R.id.next);
    next.setOnClickListener(this);
  }


  @Override
  public void onClick(View v) {

    if (v == next) {
      Map<String, Object> params = new HashMap<>();
      params.put("photo", "https://flutter.dev/images/flutter-logo-sharing.png");
      Intent intent = new FlutterBoostActivity.CachedEngineIntentBuilder(FlutterBoostActivity.class)
        .backgroundMode(FlutterActivityLaunchConfigs.BackgroundMode.opaque)
        .destroyEngineWithActivity(false)
        .url("/paper/adjust")
        .urlParams(params)
        .build(this);
      startActivity(intent);
      super.finish();
    }
  }


  @Override
  public void finish() {
    Intent intent = new Intent();
    intent.putExtra("code", 1);
    intent.putExtra("message", "Cancel");
    setResult(Activity.RESULT_OK, intent);
    super.finish();
  }
}
