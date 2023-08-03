import { context } from 'esbuild'
import getPort from 'get-port'
import { defaultPort } from './config'

export async function serve(servedir: string, options: ServeOptions) {
  const ctx = await context({ logLevel: 'silent' })
  return await ctx.serve({ servedir, port: await getPort({ port: options?.port || defaultPort }) })
}

interface ServeOptions {
  port?: number
}
