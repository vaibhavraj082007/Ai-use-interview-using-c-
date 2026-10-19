// Load env BEFORE importing modules that read process.env.
import 'dotenv/config'

import { env } from './env.js'
import { createApp } from './app.js'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`✔ API listening on http://localhost:${env.PORT}`)
  console.log(`  • env:   ${env.NODE_ENV}`)
  console.log(`  • CORS:  ${env.CLIENT_ORIGIN}`)
})
