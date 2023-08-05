import process from 'node:process'
import { Command } from 'commander'
import { build, config, dev, serve } from './index.js'

process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H')

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
    console.log({
      serve: `http://localhost:${server.port}`,
      watch: server.watch,
      static: server.static,
    })
  })

program.command('build')
  .argument('<src>', 'source directory.')
  .argument('<dst>', 'destination directory.')
  .option('-c, --clean', 'clean destination directory.')
  .option('-p, --pretty', 'prettify HTML result.')
  .action(async (src, dst, { clean, pretty }) => {
    console.log({ status: 'Building...' })
    await build(trimTrailingSlashes(src), trimTrailingSlashes(dst), {
      clean,
      pretty,
    })
    console.log({ status: 'Done.' })
  })

program.command('serve')
  .argument('<servedir>', 'directory to serve.')
  .option('-p, --port <number>', 'port number.', config.defaultPort as any)
  .action(async (servedir, options) => {
    const port = Number(options.port)
    const server = await serve(servedir, { port })
    console.log({
      serve: `http://localhost:${server.port}`,
    })
  })

program.parse()

function trimTrailingSlashes(str: string): string {
  return str.replace(/\/+$/, '')
}
