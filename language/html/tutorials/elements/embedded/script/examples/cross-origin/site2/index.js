const path = require('path');
const express = require('express');
const app = express();
const port = 3002;

app.use((req, res, next) => {
  console.log(req.originalUrl, req.get('Cookie'));
  next();
});

app.use(express.static(path.resolve(__dirname, 'public'), {
  setHeaders: function (res, path, stat) {
    res.cookie('ts', String(Date.now()));
  }
}));

app.use('/cors', express.static(path.resolve(__dirname, 'public'), {
  setHeaders: function (res, path, stat) {
    res.cookie('ts-cors', String(Date.now()));
    res.set('access-control-allow-origin', '*');
  }
}));

app.use('/cors-strict', express.static(path.resolve(__dirname, 'public'), {
  setHeaders: function (res, path, stat) {
    res.cookie('ts-cors', String(Date.now()));
    res.set('access-control-allow-origin', 'http://localhost:3001');
    res.set('Access-Control-Allow-Credentials', true);
  }
}));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
