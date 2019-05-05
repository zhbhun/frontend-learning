var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/index.css', function (req, res) {
  setTimeout(function() {
    res.sendFile(__dirname + '/index.css');
  }, 1000);
});

app.get('/a.css', function (req, res) {
  setTimeout(function() {
    res.sendFile(__dirname + '/a.css');
  }, 2000);
});

app.get('/b.css', function (req, res) {
  setTimeout(function() {
    res.sendFile(__dirname + '/b.css');
  }, 2000);
});

app.get('/c.css', function (req, res) {
  setTimeout(function() {
    res.sendFile(__dirname + '/c.css');
  }, 3000);
});

app.get('/index.js', function (req, res) {
  setTimeout(function() {
    res.sendFile(__dirname + '/index.js');
  }, 2000);
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
