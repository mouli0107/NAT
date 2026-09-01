const http = require('http')
const fs = require('fs')

const PORT = parseInt(process.env.PORT || '6200', 10)
const FILE = 'C:/Users/chandramouli/Downloads/Entity Configurator (standalone).html'

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  fs.createReadStream(FILE).pipe(res)
})

server.listen(PORT, () => {
  console.log(`\n  ➜  Entity Configurator prototype  http://localhost:${PORT}/\n`)
})
