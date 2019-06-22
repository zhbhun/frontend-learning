const path = require('path')
const express = require('express')
const app = express()
const port = 5000

app.set('etag', false)
app.disable('etag')

app.use(function(req, res, next) {
  req.headers['if-none-match'] = 'no-match-for-this';
  next();
});

app.get('/', (req, res) => {
  res.status(200);
  res.sendFile(path.resolve(__dirname, './index.html'));
});

app.use(express.static(__dirname, {
  maxAge: 31536000000
}));


app.listen(port, () => console.log(`Example app listening on port ${port}!`));
