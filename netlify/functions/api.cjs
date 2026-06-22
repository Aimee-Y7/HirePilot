const serverless = require('serverless-http')

let cachedHandler

async function getHandler() {
  if (!cachedHandler) {
    const { app, ensureDatabase } = await import('../../server/index.js')
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
