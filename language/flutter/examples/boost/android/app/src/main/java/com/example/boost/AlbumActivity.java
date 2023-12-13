package com.example.boost;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

public class AlbumActivity extends Activity implements View.OnClickListener {

  private TextView returnPhoto;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    setContentView(R.layout.album);

    returnPhoto = findViewById(R.id.return_photo);
    returnPhoto.setOnClickListener(this);
  }


  @Override
  public void onClick(View v) {

    if (v == returnPhoto) {
      Intent intent = new Intent();
      intent.putExtra("code", 0);
      intent.putExtra("message", "Success");
      intent.putExtra("data", "https://flutter.dev/images/flutter-logo-sharing.png");
      setResult(Activity.RESULT_OK, intent);
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
