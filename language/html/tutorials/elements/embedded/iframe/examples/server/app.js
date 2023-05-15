var path = require('path');
var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/TestOnLoad.html', function (req, res) {
  setTimeout(function() {
    res.sendFile(path.resolve(__dirname, '../TestOnLoad.html'));
  }, 0);
});

app.get('/embedded.html', function (req, res) {
  setTimeout(function() {
    res.sendFile(path.resolve(__dirname, '../embedded.html'));
  }, 2000);
});

app.get('/temp.html', function (req, res) {
  setTimeout(function() {
    res.sendFile(path.resolve(__dirname, '../temp.html'));
  }, 2000);
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
