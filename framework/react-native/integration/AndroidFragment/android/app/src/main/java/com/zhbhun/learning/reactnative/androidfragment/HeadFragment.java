package com.zhbhun.learning.reactnative.androidfragment;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import java.util.Date;

public class HeadFragment extends Fragment {

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_head, container, false);
    }

    @Override
    public void onResume() {
        super.onResume();
        TextView startTime = (TextView) this.getView().findViewById(R.id.startTime);
        if (startTime != null) {
            startTime.setText(String.valueOf(MyApplication.starTime.getTime()));
        }
        TextView currentTime = (TextView) this.getView().findViewById(R.id.currentTime);
        if (currentTime != null) {
            currentTime.setText(String.valueOf(new Date().getTime()));
        }
    }
}
