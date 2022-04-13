import fs from 'fs'
import path from 'path'
import { createRequestHandler } from '@remix-run/architect'
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Callback,
  Context,
} from 'aws-lambda'
import type { ServerBuild } from 'remix'

const createRemixHandler = (buildPath: string) => {
  const build = require(buildPath) as ServerBuild
  return createRequestHandler({
    build,
    getLoadContext(event) {
      // use lambda event to generate a context for loaders
      return {}
    },
  })
}

const mimeTypesMap = {
  '.js': 'application/javascript; charset=UTF-8',
}
const staticHandler = async (
  ev: APIGatewayProxyEventV2,
  _: Context,
  callback: Callback<APIGatewayProxyResultV2<never>>,
) => {
  const file = await fs.promises.readFile(`public${ev.rawPath}`)

  callback('', {
    statusCode: 200,
    body: file.toString('utf-8'),
    headers: {
      'content-type':
        Object.entries(mimeTypesMap).find(([key]) =>
          ev.rawPath.includes(key),
        )?.[1] || '',
    },
  })
}

exports.handler = async (
  event: APIGatewayProxyEventV2,
  context: Context,
  callback: Callback<APIGatewayProxyResultV2<never>>,
) => {
  if (
    event.rawPath.startsWith('/static') ||
    event.rawPath.startsWith('/favicon.ico')
  )
    return staticHandler(event, context, callback)

  const remixHandler = createRemixHandler(
    path.join(process.cwd(), '/server/build'),
  )
  const response = await remixHandler(event, context, callback)
  return response
}
