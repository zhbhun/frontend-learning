const http = require("http");

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Transfer-Encoding", "chunked");

  let count = 0;
  const interval = setInterval(() => {
    const data = { message: `Hello ${count++}` };
    res.write(JSON.stringify(data) + "\n");

    if (count > 5) {
      clearInterval(interval);
      res.end();
    }
  }, 1000); // 每秒发送一次数据
});

server.listen(3001, () => {
  console.log("Server is listening on port 3000");
});
