# 事件
```javascript
{
    "responderIgnoreScroll": true, 
    "target": 5, 
    "layoutMeasurement": { // 容器大小
        "height": 640, 
        "width": 360
    }, 
    "contentSize": { // 内容大小
        "height": 640, 
        "width": 1800
    }, 
    "contentOffset": { // 滚动偏移量
        "y": 0, 
        "x": 360
    }, 
    "contentInset": { // 
        "right": 0, 
        "left": 0, 
        "bottom": 0, 
        "top": 0
    }
}
```


- onContentSizeChange
- onScroll
- onScrollAnimationEnd
- onScrollBeginDrag

    ```javascript
    {
        dispatchConfig: { registrationName: "onScrollBeginDrag" },
        nativeEvent: {
            "responderIgnoreScroll": true, 
            "target": 5, 
            "layoutMeasurement": { // 容器大小
                "height": 640, 
                "width": 360
            }, 
            "contentSize": { // 内容大小
                "height": 640, 
                "width": 1800
            }, 
            "contentOffset": { // 滚动偏移量
                "y": 0, 
                "x": 360
            }, 
            "contentInset": { // 
                "right": 0, 
                "left": 0, 
                "bottom": 0, 
                "top": 0
            }
        }
    }
    ```


- onScrollEndDrag

    ```javascript
    {
        dispatchConfig: { registrationName: "onScrollEndDrag" },
        nativeEvent: {
            "responderIgnoreScroll": true, 
            "target": 5, 
            "layoutMeasurement": {
                "height": 640, 
                "width": 360
            }, 
            "contentSize": {
                "height": 640, 
                "width": 1800
            }, 
            "contentOffset": { // 拖动结束时的偏移量
                "y": 0, 
                "x": 1146.3333740234375
            }, 
            "contentInset": {
                "right": 0, 
                "left": 0, 
                "bottom": 0, 
                "top": 0
            }
        }   
    }
    ```

- onTouchStart
- onTouchMove
- onTouchEnd
- onMomentumScrollBegin
- onMomentumScrollEnd

    ```javascript
    {
        dispatchConfig: { registrationName: "onMomentumScrollEnd" },
        nativeEvent: {
            "responderIgnoreScroll": true, 
            "target": 5, 
            "layoutMeasurement": { // 容器大小
                "height": 640, 
                "width": 360
            }, 
            "contentSize": { // 滚动大小
                "height": 640, 
                "width": 1800
            },
            "contentOffset": { // 惯性滚动结束时的偏移量
                "y": 0, 
                "x": 1146.3333740234375
            }, 
            "contentInset": { // 内边距
                "right": 0, 
                "left": 0, 
                "bottom": 0, 
                "top": 0
            }
        }
    }

# 获取位置
- [Get current scroll position of ScrollView in React Native](https://stackoverflow.com/questions/29503252/get-current-scroll-position-of-scrollview-in-react-native)

# 嵌套滚动
- [[Android] Nested ScrollView won't scroll](https://github.com/facebook/react-native/issues/2967#issuecomment-142933311)
- https://www.npmjs.com/package/react-native-nested-scroll-view
- [React Native nested ScrollView locking up](https://stackoverflow.com/questions/29756217/react-native-nested-scrollview-locking-up)

# 事件
- http://lib.csdn.net/article/react/57658?knId=674
- https://www.jianshu.com/p/93b923212d40
