import http from 'node:http'
import path from 'pathe'
import { renderToStaticMarkup } from 'react-dom/server'
import getPort from 'get-port'
import esbuild from 'esbuild'
import { watch as chokidar } from 'chokidar'
import { builder, copyFile, deleteFile, exists, injectScript, readDir, writeFile } from './util'
import * as config from './config'

const { defaultDelay, defaultPort, defaultStatic, pkg } = config

export { config }

export async function build(src: string, dst: string, options?: BuildOptions): Promise<void> {
  const staticDir = options?.static || defaultStatic
  if (options?.clean) {
    await deleteFile(dst)
  }
  if (await exists(staticDir)) {
    for (const file of await readDir(staticDir)) {
      const destFile = file.replace(staticDir, dst)
      await copyFile(file, destFile)
    }
  }
  const files = await readDir(src)
  const entryPoints = files.filter(i => i.endsWith('.tsx') || i.endsWith('.jsx'))
  const outdir = `.${pkg.name}`

  async function renderHTML(outfile: string) {
    const module = await import(path.resolve(outfile))
    const content = renderToStaticMarkup(module.default())
    return writeFile(`${outfile.replace(outdir, dst).slice(0, -3)}html`, options?.pretty ? await prettify(content) : content)
  }

  await builder({
    entryPoints,
    outdir,
  })

  const outputFiles = (entryPoints.map(i => `${i.replace(src, outdir).slice(0, -3)}mjs`))

  await Promise.all(outputFiles.map(renderHTML))

  deleteFile(outdir)
}

async function prettify(html: string): Promise<string> {
  const { format } = await import('prettier')
  return format(html, {
    parser: 'html',
    arrowParens: 'always',
    bracketSameLine: false,
    bracketSpacing: true,
    embeddedLanguageFormatting: 'auto',
    htmlWhitespaceSensitivity: 'ignore',
    insertPragma: false,
    jsxSingleQuote: false,
    printWidth: 9999999999,
    proseWrap: 'preserve',
    quoteProps: 'as-needed',
    requirePragma: false,
    semi: false,
    singleAttributePerLine: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'es5',
    useTabs: false,
    vueIndentScriptAndStyle: false,
  })
}

const clients: (http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage })[] = []

export async function dev(src: string, options?: DevOptions): Promise<{ port: number; watch: string[]; static: string }> {
  const servedir = options?.static || defaultStatic
  const ctx = await esbuild.context({})
  const esbuildPort = await getPort({ port: defaultPort + 1 })
  const { host, port } = await ctx.serve({ port: esbuildPort, servedir })
  const proxyPort = await getPort({ port: options?.port || defaultPort })
  const eventSourcePort = await getPort({ port: defaultPort + 2 })
  const delay = typeof options !== 'undefined' && typeof options.delay !== 'undefined' ? options.delay : defaultDelay

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

  const watch = (options?.watch || path.join(src, '**', '*')).split(',')
  for (const pattern of watch) {
    chokidar(pattern, { ignoreInitial: true }).on('all', () => {
      setTimeout(() => {
        reload()
      }, delay)
    })
  }

  return {
    port: proxyPort,
    watch,
    static: servedir,
  }
}

export function reload(): void {
  clients.forEach(res => res.write('data: update\n\n'))
  clients.length = 0
}

export async function serve(servedir: string, options?: ServeOptions) {
  const ctx = await esbuild.context({ logLevel: 'silent' })
  return await ctx.serve({ servedir, port: await getPort({ port: options?.port || defaultPort }) })
}

interface BuildOptions {
  clean?: boolean
  pretty?: boolean
  static?: string
}

interface DevOptions {
  port?: number
  watch?: string
  delay?: number
  static?: string
}

interface ServeOptions {
  port?: number
}
