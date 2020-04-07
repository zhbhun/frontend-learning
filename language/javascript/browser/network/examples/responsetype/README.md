# ResponseType

## 常见问题

- responseType 设置为 JSON 对比使用 Text 自行解析的性能差异

    [fetch-vs-xhr-perf](https://github.com/arendjr/fetch-vs-xhr-perf)

    **tl;dr: If performance is critical, you're better off using XMLHttpRequest without setting the responseType for now.**

- responseType 设置为 JSON 时遇到服务端响应格式问题，会导致响应为空

    - [XMLHttpRequest.responseType](https://docs.w3cub.com/dom/xmlhttprequest/responsetype/) / https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/responseType

        > When setting responseType to a particular value, the author should make sure that the server is actually sending a response compatible with that format. If the server returns data that is not compatible with the responseType that was set, the value of response will be null.

    - [Missing response value on ajax result.](https://github.com/ReactiveX/rxjs/issues/2007)

        RxJS Ajax 请求默认将 responseType 设置为 json，在服务端返回错误格式的响应内容时，响应值为空

        https://github.com/ReactiveX/rxjs/blob/71aa2ea160d779936648e10aefb3978f0b156c83/src/internal/observable/dom/AjaxObservable.ts#L167
