import http from 'node:http'
import getPort from 'get-port'
import esbuild from 'esbuild'
import path from 'pathe'
import { renderToStaticMarkup } from 'react-dom/server'
import { watch as chokidar } from 'chokidar'
import { builder, deleteFile, exists } from './util'
import { defaultPort, defaultStatic } from './config'

const clients: (http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage })[] = []

export async function dev(src: string, options?: DevOptions): Promise<{ port: number; watch: string; static: string }> {
  const servedir = options?.static || defaultStatic
  const ctx = await esbuild.context({})
  const esbuildPort = await getPort({ port: defaultPort + 1 })
  const { host, port } = await ctx.serve({ port: esbuildPort, servedir })
  const proxyPort = await getPort({ port: options?.port || defaultPort })
  const eventSourcePort = await getPort({ port: defaultPort + 2 })

  // Proxy server
  http.createServer(async (req, res) => {
    const url = req.url
    if (url && (url.endsWith('/') || url.endsWith('.html'))) {
      const filename = (url.endsWith('/') ? `${url}index.html` : url).substring(1)
      const filepath = `${path.join(src, filename).slice(0, -4)}tsx`
      if (await exists(filepath)) {
        const outfile = `${Math.random()}.mjs`
        await builder({
          entryPoints: [filepath],
          outfile,
        })
        try {
          const module = await import(path.resolve(outfile))
          const content = renderToStaticMarkup(module.default())
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(injectScript(content, eventSourcePort))
        }
        catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/html' })
          console.log(error)
          res.end((error as any).toString())
        }
        deleteFile(outfile)
      }
      else {
        res.writeHead(404, { 'Content-Type': 'text/html' })
        res.end('<pre>404 - Not Found</pre>')
      }
    }
    else {
      // Forward each incoming request to esbuild
      const options = {
        hostname: host,
        port,
        path: req.url,
        method: req.method,
        headers: req.headers,
      }
      const proxyReq = http.request(options, (proxyRes) => {
        // Forward the response from esbuild to the client
        proxyRes.statusCode && res.writeHead(proxyRes.statusCode, proxyRes.headers)
        proxyRes.pipe(res, { end: true })
      })
      // Forward the body of the request to esbuild
      req.pipe(proxyReq, { end: true })
    }
  }).listen(proxyPort)

  // Event source server
  http.createServer((_req, res) => {
    return clients.push(
      res.writeHead(200, {
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      }),
    )
  }).listen(eventSourcePort)

  const watch = options?.watch || path.join(src, '**', '*')
  chokidar(watch, { ignoreInitial: true }).on('all', () => {
    setTimeout(() => {
      reload()
    }, 200)
  })

  return {
    port: proxyPort,
    watch,
    static: servedir,
  }
}

function injectScript(html: string, port: number): string {
  const bodyEndPosition = html.lastIndexOf('</body>')
  const injectPosition = bodyEndPosition === -1 ? html.length : bodyEndPosition
  const script = `(() => new EventSource('http://localhost:${port}').onmessage = () => location.reload())()`
  return (`${html.substring(0, injectPosition)}<script>${script}</script>\n${html.substring(injectPosition)}`)
}

export function reload(): void {
  clients.forEach(res => res.write('data: update\n\n'))
  clients.length = 0
}

interface DevOptions {
  port?: number
  watch?: string
  static?: string
}
