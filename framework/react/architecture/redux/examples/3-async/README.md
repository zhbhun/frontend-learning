> 该示例包含了：从异步 API 的读取操作、基于用户的输入来获取数据、显示正在加载的提示、缓存响应、以及使缓存过期失效。使用 Redux Thunk 中间件来封装异步带来的附带作用。 —— http://cn.redux.js.org/docs/introduction/Examples.html#async

# 功能
- 帖子列表
- 切换话题
- 刷新列表

# Store
- selectedReddit
- postsByReddit

# Action
- SELECT_REDDIT
- REQUEST_POSTS
- RECEIVE_POSTS
- INVALIDATE_REDDIT

# Reduces
...
