const express = require('express')

const app = express()
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'html');
app.set('views', __dirname);
const port = 5000

function route(req, res, time) {
  setTimeout(() => {
    res.render('index');
  }, time)
}

app.get('/portal', (req, res) => {
  res.render('portal');
})

app.get('/0', (req, res) => {
  route(req, res, 0)
})

app.get('/100', (req, res) => {
  route(req, res, 100)
})

app.get('/200', (req, res) => {
  route(req, res, 200)
})

app.get('/300', (req, res) => {
  route(req, res, 300)
})

app.get('/400', (req, res) => {
  route(req, res, 400)
})

app.get('/500', (req, res) => {
  route(req, res, 500)
})

app.get('/600', (req, res) => {
  route(req, res, 600)
})

app.get('/700', (req, res) => {
  route(req, res, 700)
})

app.get('/800', (req, res) => {
  route(req, res, 800)
})

app.get('/900', (req, res) => {
  route(req, res, 900)
})

app.get('/1000', (req, res) => {
  route(req, res, 1000)
})

app.get('/1200', (req, res) => {
  route(req, res, 1200)
})

app.get('/1400', (req, res) => {
  route(req, res, 1400)
})

app.get('/1600', (req, res) => {
  route(req, res, 1600)
})

app.get('/1800', (req, res) => {
  route(req, res, 1800)
})

app.get('/2000', (req, res) => {
  route(req, res, 2000)
})

app.get('/2500', (req, res) => {
  route(req, res, 2500)
})

app.get('/3000', (req, res) => {
  route(req, res, 3000)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
