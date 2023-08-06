
# halaman

JSX to html generator

**This package is a ESM package. Your project needs to be ESM too. [Read more](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).**


## Installation

```bash
npm install halaman
```

This generator relies on `react/jsx-runtime`, so make sure to install the `react` library as well.

```bash
npm install react @types/react
```
## Usage

```
Usage: halaman [options] [command]

JSX to html generator

Options:
  -V, --version                output the version number
  -h, --help                   display help for command

Commands:
  dev [options] <src>
  build [options] <src> <dst>
  serve [options] <servedir>
  help [command]               display help for command
```


## Programmatic usage

```typescript
import { build, dev, serve } from 'halaman'

const src = 'src/pages'
const dst = 'dist'

// build
await build(src, dst)
await build(src, dst, {
  clean: true,
  pretty: true,
})

// dev
const server = await dev(src, {
  watch: 'src/**/*',
})
console.log(server)

// serve
const server = await serve(dst)
console.log(server)
```
