const express = require('express')
const app = express()
app.get('/', (req, res) => { res.sendFile('index.html', { root: __dirname }) })
app.use(express.static('./'))
app.listen(8080, function () {
  console.log('Server started')
})
