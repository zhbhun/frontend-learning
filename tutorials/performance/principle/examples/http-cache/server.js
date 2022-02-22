const path = require('path');
const express = require('express');
const app = express();
const port = 5000;

// 无缓存情况
const router1 = express.Router();
router1.use(function (req, res, next) {
  const writeHead = res.writeHead;
  res.writeHead = function () {
    res.removeHeader('Cache-Control');
    res.removeHeader('Etag');
    res.removeHeader('Last-Modified');
    return writeHead.apply(this, arguments);
  };
  next();
})
router1.get('/', (req, res) => {
  res.status(200);
  res.sendFile(path.resolve(__dirname, './index.html'));
});
router1.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  maxAge: 0
}));
app.use('/1', router1);

// 测试启发式缓存算法
const router2 = express.Router();
router2.use(function (req, res, next) {
  const writeHead = res.writeHead;
  res.writeHead = function () {
    res.removeHeader('Cache-Control');
    return writeHead.apply(this, arguments);
  };
  next();
})
router2.get('/', (req, res) => {
  res.status(200);
  res.sendFile(path.resolve(__dirname, './index.html'));
});
router2.use(express.static(__dirname, {
  etag: true,
  lastModified: true,
  maxAge: 0,
  setHeaders: (res, path, stat) => {
    const time = new Date(Date.now() - (1000 * 100)); // 100 秒之前，在 10 秒后失效
    const headers = {
      'last-modified': time.toString(),
    };
    Object.keys(headers).forEach(key => {
      res.set(key, headers[key]);
    });
  }
}));
app.use('/2', router2);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
