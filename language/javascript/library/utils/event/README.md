# Event

| Event | EventEmitter | EventTarget |
| --- | --- | --- |
| Prepend | ✓ | ☓ |
| Once | ✓ | ✓ |
| Capture | ☓ | ✓ |
| Bubble | ☓ | ✓ |
| Stop | ☓ | ✓ |
| Prevent | ☓ | ✓ |

## EventEmitter

- [events](https://github.com/browserify/events) - Node's event emitter for all engines.
- [event-emitter](https://github.com/medikoo/event-emitter) - Environment agnostic event emitter solution for JavaScript
- [eventemitter3](https://github.com/primus/eventemitter3) - EventEmitter3 - Because there's also a number 2. And we're faster.
- [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2) - A nodejs event emitter implementation with namespaces, wildcards, TTL, works in the browser


## EventTarget

- [event-target-shim](https://github.com/mysticatea/event-target-shim) - An implementation of WHATWG EventTarget interface, plus few extensions.

参考文献

- [The CustomEvent interface](https://dev.to/cloudx/the-customevent-interface-2bfo)
- [Using the EventTarget interface](https://dev.to/cloudx/using-the-eventtarget-interface-5f0f)

## 问题

### 旧版浏览器不可继承 EventTarget

- [Issue 740576: Add EventTarget constructor](https://bugs.chromium.org/p/chromium/issues/detail?id=740576)
- [Support extending EventTarget](https://github.com/jsdom/jsdom/issues/2156)
