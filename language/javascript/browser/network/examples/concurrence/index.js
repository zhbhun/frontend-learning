const express = require("express");

const app = express();
const port = 3000;

app.use(express.static("public"));

app.get("/apis/timeout", (req, res) => {
  setTimeout(() => {
    res.json({ message: "Hello World!" });
  }, 1000);
});

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
