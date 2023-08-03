
# halaman

JSX to html generator


## Installation

```bash
npm install halaman
```

This generator relies on `react/jsx-runtime`, so make sure to install the `react` library as well.

```bash
npm install react @types/react
```
## Usage/Examples

```bash
# help
halaman --help
halaman build --help
halaman dev --help
halaman serve --help

# build
halaman build src dst
halaman build src dst --clean --pretty

# dev
halaman dev src
halaman dev src/pages --port 3000 --static public --watch "src/**/*"

# serve
halaman serve dst
halaman serve dst --port 3000
```


## API

```typescript
import { build, dev } from 'halaman'

const src = 'src/pages'
const dst = 'dist'

// build
await build(src, dst)
await build(src, dst, {
  clean: true,
  pretty: true,
})

// dev
server = await dev(src, {
  watch: 'src/**/*',
})
console.log(server)
```
