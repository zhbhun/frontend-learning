import { Logger } from '@hocuspocus/extension-logger'
import { SQLite } from '@hocuspocus/extension-sqlite'
import { Hocuspocus } from '@hocuspocus/server'
import express from 'express'
import expressWebsockets from 'express-ws'

const hocuspocus = new Hocuspocus({
  name: 'tester',
  timeout: 30000,
  debounce: 5000,
  maxDebounce: 30000,
  quiet: true,
  extensions: [
    new Logger(),
    new SQLite({
      database: 'db.sqlite',
    }),
  ],
})

const { app } = expressWebsockets(express())

app.get('/', (request, response) => {
  response.send('Hello World!')
})

app.ws('/', (websocket, request) => {
  const context = { user_id: 1234 }
  hocuspocus.handleConnection(websocket, request, context)
})

app.listen(5174, () => console.log('Listening on http://127.0.0.1:5174'))
