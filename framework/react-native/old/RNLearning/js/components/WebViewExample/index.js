import HTMLStaticTest from './HTMLStaticTest';
import HTMLBundledTest from './HTMLBundledTest';
import UriPOSTTest from './UriPOSTTest';
import RenderTest from './RenderTest';
import ScaleTest from './ScaleTest';
import APITest from './APITest';
import MessagingTest from './MessagingTest';
import EventTest from './EventTest';
import InjectedJavaScriptTest from './InjectedJavaScriptTest';
import DisableTextSelection from './DisableTextSelection';

export const displayName = 'WebViewExample';

export const title = '<WebView>';

export const description = 'Base component to display web content';

export const examples = [
  HTMLStaticTest,
  HTMLBundledTest,
  UriPOSTTest,
  RenderTest,
  ScaleTest,
  APITest,
  MessagingTest,
  EventTest,
  InjectedJavaScriptTest,
  DisableTextSelection,
];
