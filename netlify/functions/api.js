import serverless from 'serverless-http'
import { app, ensureDatabase } from '../../server/index.js'

const expressHandler = serverless(app, {
  request(request, event) {
    const forwardedPath =
      event.path.match(/^\/\.netlify\/functions\/api(\/.*)?$/)?.[1] ??
      event.path.match(/^\/api(\/.*)?$/)?.[1] ??
      ''

    request.url = `/api${forwardedPath}${event.rawQuery ? `?${event.rawQuery}` : ''}`
  },
})

export async function handler(event, context) {
  await ensureDatabase()
  return expressHandler(event, context)
}
