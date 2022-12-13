const path = require("path");
const express = require("express");
const app = express();
const port = 3000;

app.use(express.static("public"));

app.get("/font.otf", (req, res) => {
  res.sendFile(path.resolve(__dirname, "./public/fonts/NotoSansSC-Bold.otf"));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
