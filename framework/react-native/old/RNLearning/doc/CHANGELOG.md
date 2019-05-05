# 0.25.1
Deprecations

Requiring React API from react-native is now deprecated - 2eafcd4 0b534d1

Instead of:

`import React, { Component, View } from 'react-native';`

you should now:

```
import React, { Component } from 'react';
import { View } from 'react-native';
```

# 0.26.0
Breaking changes

- React API must be now required from react package (previously a warning on 0.25)
- setBridge is no longer called on the main thread - 34ec6a9

# 0.27.0
Breaking changes

- Kill NavigationLegacyNavigator (ef44781) - @hedgerwang
- Kill NavigationExperimental Containers (14eb427) - @ericvicenti
- Kill NavigationView (c3714d7) - @hedgerwang

Deprecations

- Keyboard events should now be registered via Keyboard module:

```javascript
// previously
const { DeviceEventEmitter } = require('react-native');
DeviceEventEmitter.addListener('keyboardWillShow', func);

// on 0.27.2 and newer
const { Keyboard } = require('react-native');
Keyboard.addListener('keyboardWillShow', func);

// 0.27.0 & 0.27.1
const Keyboard = require('Keyboard');
Keyboard.addListener('keyboardWillShow', func);
```
# 0.28.0
Breaking changes

- flex styling property behavior now behaves slightly differently. If you previously used flex: 1 where not necessary this change will likely break your layout as the measuring behavior is slightly different than before due to performance optimizations. Removing that unnecessary flex: 1 will solve your layout in most cases.
- Due to performance tweaks flexWrap: wrap no longer works together with alignItems: 'stretch' (the default). If you use flexWrap: wrap you probably will want to add the alignItems: 'flex-start' style as well.
