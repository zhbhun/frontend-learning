const express = require("express");

const app = express();
const port = 3000;

app.use(express.static("public"));

app.get("/apis/json", (req, res) => {
  setTimeout(() => {
    res.json({ message: "Hello World!" });
  }, 0);
});

app.get("/apis/text", (req, res) => {
  setTimeout(() => {
    res.send("Hello World!");
  }, 0);
});

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
