const path = require("path");
const express = require("express");
const app = express();
const port = 3000;

app.get("/style", (req, res) => {
  setTimeout(() => {
    res.sendFile(path.resolve(__dirname, "./block-tester.css"));
  }, Number(req.query.time || "3000"));
});

app.get("/script/async", (req, res) => {
  setTimeout(() => {
    res.sendFile(path.resolve(__dirname, "./block-tester-async.js"));
  }, Number(req.query.time || "3000"));
});

app.get("/script/async-1", (req, res) => {
  setTimeout(() => {
    res.sendFile(path.resolve(__dirname, "./block-tester-async-1.js"));
  }, Number(req.query.time || "1000"));
});

app.get("/script/default", (req, res) => {
  setTimeout(() => {
    res.sendFile(path.resolve(__dirname, "./block-tester-default.js"));
  }, Number(req.query.time || "3000"));
});

app.get("/script/defer", (req, res) => {
  setTimeout(() => {
    res.sendFile(path.resolve(__dirname, "./block-tester-defer.js"));
  }, Number(req.query.time || "3000"));
});

app.use(express.static("."));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
