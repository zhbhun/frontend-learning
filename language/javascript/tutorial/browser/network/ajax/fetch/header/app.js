const express = require("express");
const app = express();
const port = 3000;

app.use(express.static("public"));

app.get("/api/text/event-steam", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let count = 0;
  const interval = setInterval(() => {
    count++;
    const data = { error: 0, message: "success", data: `123-${count}` };
    res.write(`data: ${JSON.stringify(data)}\n\n`);

    if (count >= 5) {
      clearInterval(interval);
      res.end();
    }
  }, 1000);
});

app.get("/api/application/octet-stream", (req, res) => {
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Transfer-Encoding", "chunked");

  let count = 0;
  const interval = setInterval(() => {
    count++;
    const data = { error: 0, message: "success", data: `123-${count}` };
    const buffer = Buffer.from(JSON.stringify(data) + "\n", "utf-8");
    res.write(buffer);

    if (count >= 5) {
      clearInterval(interval);
      res.end();
    }
  }, 1000);
});

app.listen(3000, () => {
  console.log(`Example app listening on port ${port}`);
});
