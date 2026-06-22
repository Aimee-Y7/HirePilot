const serverless = require('serverless-http')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

let cachedHandler

async function getHandler() {
  if (!cachedHandler) {
    const serverEntry = pathToFileURL(
      path.join(process.cwd(), 'server', 'index.js'),
    ).href
    const { app, ensureDatabase } = await import(serverEntry)
    await ensureDatabase()

    cachedHandler = serverless(app, {
      request(request, event) {
        const forwardedPath =
          event.path.match(/^\/\.netlify\/functions\/api(\/.*)?$/)?.[1] ??
          event.path.match(/^\/api(\/.*)?$/)?.[1] ??
          ''

        request.url = `/api${forwardedPath}${
          event.rawQuery ? `?${event.rawQuery}` : ''
        }`
      },
    })
  }

  return cachedHandler
}

exports.handler = async (event, context) => {
  const handler = await getHandler()
  return handler(event, context)
}
