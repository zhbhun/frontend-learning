## 初始化

- `createRoot`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/client/ReactDOM.js#L150

    `createRootImpl()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/client/ReactDOM.js#L162C10-L162C24

- `createRoot`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/client/ReactDOMRoot.js#L166

    `listenToAllSupportedEvents()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/client/ReactDOMRoot.js#L240

- `listenToAllSupportedEvents`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L386

    `listenToNativeEvent()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L396

- `listenToNativeEvent`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L326

    `addTrappedEventListener()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L345

- `addTrappedEventListener`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L414

    - `createEventListenerWrapperWithPriority(...)`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L421
    - `addEventCaptureListenerWithPassiveFlag(...)`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L477

## 触发事件

- `dispatchDiscreteEvent`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/ReactDOMEventListener.js#L113

    `dispatchEvent()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/ReactDOMEventListener.js#L124

- `dispatchEvent`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/ReactDOMEventListener.js#L149

    `dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/ReactDOMEventListener.js#L159

- `dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/ReactDOMEventListener.js#L265

    `dispatchEventForPluginEventSystem()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/ReactDOMEventListener.js#L278

- `dispatchEventForPluginEventSystem`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L536

    - `batchedUpdates()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L636
    - `dispatchEventsForPlugins()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L637

- `dispatchEventsForPlugins`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L275

    - `extractEvents()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L284
    - `processDispatchQueue()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L293

- `processDispatchQueue`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L261

    `processDispatchQueueItemsInOrder()`: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js#L268
