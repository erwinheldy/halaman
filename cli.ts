import { Command } from 'commander'
import { context } from 'esbuild'
import getPort from 'get-port'
import { build, config, dev } from './index.js'

const program = new Command()

program
  .name(config.pkg.name)
  .description(config.pkg.description)
  .version(config.pkg.version)

program.command('dev')
  .argument('<src>', 'source directory.')
  .option('-p, --port <number>', 'port number.', config.defaultPort as any)
  .option('-w, --watch <string>', 'globs to watch on the file system. (default: "<src>/**/*")')
  .option('-s, --static <string>', 'static assets root directory.', config.defaultStatic)
  .action(async (src, options) => {
    const server = await dev(trimTrailingSlashes(src), {
      port: Number(options.port),
      watch: options.watch,
      static: options.static,
    })
    console.log(`Serve: http://localhost:${server.port}`)
    console.log('Watch:', server.watch)
    console.log('Static:', server.static)
  })

program.command('build')
  .argument('<src>', 'source directory.')
  .argument('<dst>', 'destination directory.')
  .option('-c, --clean', 'clean destination directory.')
  .option('-p, --pretty', 'prettify HTML result.')
  .action(async (src, dst, { clean, pretty }) => {
    await build(trimTrailingSlashes(src), trimTrailingSlashes(dst), {
      clean,
      pretty,
    })
  })

program.command('serve')
  .argument('<servedir>', 'directory to serve.')
  .option('-p, --port <number>', 'port number.', config.defaultPort as any)
  .action(async (servedir, options) => {
    const port = Number(options.port)
    const ctx = await context({ logLevel: 'silent' })
    const server = await ctx.serve({ servedir, port: await getPort({ port }) })
    console.log(`Serve: http://localhost:${server.port}`)
  })

program.parse()

function trimTrailingSlashes(str: string) {
  return str.replace(/\/+$/, '')
}
