- http://facebook.github.io/react-native/releases/0.43/docs/native-modules-ios.html#sending-events-to-javascript
- http://facebook.github.io/react-native/releases/0.43/docs/native-modules-android.html#sending-events-to-javascript


---

- https://stackoverflow.com/questions/36692416/deviceeventemitter-vs-nativeappeventemitter
- https://github.com/facebook/react-native/issues/8714
- [What is the method can be used to send an event from native module to JS？](https://github.com/facebook/react-native/issues/8714)
- [React Native 集成至已有 APP — 双向通信 II](https://nodefe.com/communication-between-ios-and-react-native-two/)

```
import { NativeAppEventEmitter } from 'react-native';

var subscription = NativeAppEventEmitter.addListener(
  'EventReminder',
  (reminder) => console.log(reminder.name)
);
...
// 千万不要忘记忘记取消订阅, 通常在componentWillUnmount函数中实现。
subscription.remove();
```

---

```
import { NativeEventEmitter, NativeModules } from 'react-native';
const { CalendarManager } = NativeModules;

const calendarManagerEmitter = new NativeEventEmitter(CalendarManager);

const subscription = calendarManagerEmitter.addListener(
  'EventReminder',
  (reminder) => console.log(reminder.name)
);
...
// Don't forget to unsubscribe, typically in componentWillUnmount
subscription.remove();
```


---


```
/**
 * @providesModule MYNavigateBack
 */
import Platform from 'Platform';
import NativeModules from 'NativeModules';
import {
  NativeEventEmitter,
  DeviceEventEmitter,
  NativeAppEventEmitter,
} from 'react-native';

let FilterUserActions = null;
let nativeEventEmitter = null;
if (Platform.OS === 'ios') {
  FilterUserActions = NativeModules.IMYFilterUserActionsModule;
} else {
  FilterUserActions = NativeModules.AMYFilterUserActionsModule;
}
if (FilterUserActions) {
  nativeEventEmitter = new NativeEventEmitter(FilterUserActions);
} else {
  const unsupport = () => null;
  FilterUserActions = { interceptBackPress: unsupport };
  nativeEventEmitter = { addListener: unsupport };
}
const handlers = [];
let intercepted = false;
let subscription = null;

function dispatch() {
  // TODO 优化
  console.warn('nativeEventEmitter-OnBackPressEvent');
  const handler = handlers[handlers.length - 1];
  if (handler) {
    handler();
    // const processed = handler();
    // if (!processed) {
    //   MeiyouRNBridge.runAction('goback', { count: 1 }, {});
    // }
  }
}

class NavigateBack {
  static addListener(callback) {
    const index = handlers.indexOf(callback);
    if (index >= 0) {
      return;
    }
    handlers.push(callback);
    if (!intercepted) {
      FilterUserActions.interceptBackPress(true);
      intercepted = true;
    }
    if (!subscription) {
      subscription = nativeEventEmitter.addListener('OnBackPressEvent', dispatch);
      NativeAppEventEmitter.addListener('OnBackPressEvent', (event) => {
        console.warn('NativeAppEventEmitter-OnBackPressEvent');
      });
      DeviceEventEmitter.addListener('OnBackPressEvent', (event) => {
        console.warn('DeviceEventEmitter-OnBackPressEvent');
      });
    }
  }

  static removeListener(event, callback) {
    const index = handlers.indexOf(callback);
    if (index < 0) {
      return;
    }
    handlers.splice(index, 1);
    if (handlers.length === 0) {
      if (intercepted) {
        FilterUserActions.interceptBackPress(false);
        intercepted = false;
      }
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
    }
  }
}

export default NavigateBack;

```
