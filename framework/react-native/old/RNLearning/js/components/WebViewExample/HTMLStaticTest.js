import React from 'react';
import { WebView } from 'react-native';

const BGWASH = 'rgba(255,255,255,0.8)';

export default function HTMLStaticTest(props): React.Element<any> {
  return (
    <WebView
      {...props}
      style={{
        backgroundColor: BGWASH,
        height: 100,
      }}
      source={{html: HTML}}
      scalesPageToFit={true}
    />
  );
}

const HTML = `
<!DOCTYPE html>\n
<html>
  <head>
    <title>Hello Static World</title>
    <meta http-equiv="content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=320, user-scalable=no">
    <style type="text/css">
      body {
        margin: 0;
        padding: 0;
        font: 62.5% arial, sans-serif;
        background: #ccc;
      }
      h1 {
        padding: 45px;
        margin: 0;
        text-align: center;
        color: #33f;
      }
    </style>
  </head>
  <body>
    <h1>Hello Static World</h1>
  </body>
</html>
`;

HTMLStaticTest.title = 'Static HTML Test';
