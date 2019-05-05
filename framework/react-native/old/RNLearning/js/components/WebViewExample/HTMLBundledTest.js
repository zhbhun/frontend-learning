import React from 'react';
import { WebView } from 'react-native';

const BGWASH = 'rgba(255,255,255,0.8)';

export default function HTMLBundledTest(): React.Element<any> {
  return (
    <WebView
      style={{
        backgroundColor: BGWASH,
        height: 100,
      }}
      source={require('./html/helloworld.html')}
      scalesPageToFit={true}
    />
  );
}

HTMLBundledTest.title = 'Bundled HTML Test';
