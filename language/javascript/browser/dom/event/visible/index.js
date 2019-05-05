const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  console.log('Hello World!')
  res.append('Access-Control-Allow-Origin', '*');
  res.send('Hello World!')
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
