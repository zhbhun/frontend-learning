package com.rnn;

// import android.app.Application;
// import android.util.Log;

// import com.facebook.react.ReactApplication;
// import com.facebook.react.ReactInstanceManager;
// import com.facebook.react.ReactNativeHost;
// import com.facebook.react.ReactPackage;
// import com.facebook.react.shell.MainReactPackage;
// import com.facebook.soloader.SoLoader;

// import java.util.Arrays;
// import java.util.List;

import android.support.annotation.Nullable;

import com.facebook.react.ReactPackage;
import com.reactnativenavigation.NavigationApplication;

import java.util.List;

public class MainApplication extends NavigationApplication {

//   private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
//     @Override
//     protected boolean getUseDeveloperSupport() {
//       return BuildConfig.DEBUG;
//     }

//     @Override
//     protected List<ReactPackage> getPackages() {
//       return Arrays.<ReactPackage>asList(
//           new MainReactPackage()
//       );
//     }
//   };

//   @Override
//   public ReactNativeHost getReactNativeHost() {
//     return mReactNativeHost;
//   }

//   @Override
//   public void onCreate() {
//     super.onCreate();
//     SoLoader.init(this, /* native exopackage */ false);
//   }

  	@Override
    public boolean isDebug() {
        return BuildConfig.DEBUG;
    }

    @Nullable
    @Override
    public List<ReactPackage> createAdditionalReactPackages() {
        return null;
    }
}
