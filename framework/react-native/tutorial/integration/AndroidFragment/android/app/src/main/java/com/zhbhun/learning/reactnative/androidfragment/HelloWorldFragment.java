package com.zhbhun.learning.reactnative.androidfragment;

import android.os.Bundle;

public class HelloWorldFragment extends ReactFragment {

    @Override
    public String getMainComponentName() {
        return "app"; // name of our React Native component we've registered
    }

    @Override
    public Bundle getLaunchOptions() {
        Bundle bundle = new Bundle();
        bundle.putString("page", "/helloworld");
        return bundle;
    }
}
