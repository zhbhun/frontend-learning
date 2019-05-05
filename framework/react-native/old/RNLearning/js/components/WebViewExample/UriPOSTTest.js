import React from 'react';
import { WebView } from 'react-native';

const BGWASH = 'rgba(255,255,255,0.8)';

export default function UriPOSTTest(): React.Element<any> {
  return (
    <WebView
      style={{
        backgroundColor: BGWASH,
        height: 100,
      }}
      source={{
        uri: 'http://www.posttestserver.com/post.php',
        method: 'POST',
        body: 'foo=bar&bar=foo'
      }}
      scalesPageToFit={true}
    />
  );
}

UriPOSTTest.title = 'Uri POST Test';
