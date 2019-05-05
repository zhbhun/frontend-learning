package com.zhbhun.learning.reactnative.androidfragment;

import android.app.Fragment;
import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactRootView;

public abstract class ReactFragment extends Fragment {
    private ReactRootView mReactRootView;
    private ReactInstanceManager mReactInstanceManager;

    // This method returns the name of our top-level component to show
    public abstract String getMainComponentName();

    public Bundle getLaunchOptions() {
        return null;
    }

    @Override
    public void onAttach(Context context) {
        super.onAttach(context);
        mReactRootView = new ReactRootView(context);
        mReactInstanceManager =
                ((MyApplication) getActivity().getApplication())
                        .getReactNativeHost()
                        .getReactInstanceManager();
    }

    @Override
    public ReactRootView onCreateView(LayoutInflater inflater, ViewGroup group, Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        return mReactRootView;
    }


    @Override
    public void onActivityCreated(Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        mReactRootView.startReactApplication(
                mReactInstanceManager,
                getMainComponentName(),
                this.getLaunchOptions()
        );
    }
}
