import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import process from 'node:process'
import path from 'pathe'
import { build } from 'esbuild'
import type { BuildOptions } from 'esbuild'

export const require = createRequire(import.meta.url)

export async function readDir(dir: string): Promise<string[]> {
  if (await exists(dir)) {
    const files: (string | any[])[] = []
    const items = await fs.readdir(dir, { withFileTypes: true })
    for (const item of items) {
      const pathName = path.join(dir, item.name)
      files.push(item.isDirectory() ? await readDir(pathName) : pathName)
    }
    return files.flat(Number.POSITIVE_INFINITY) as string[]
  }
  else {
    return []
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  return fs.rm(filePath, {
    recursive: true,
    force: true,
  })
}

export async function writeFile(filePath: string, data: any): Promise<void> {
  const dir = path.dirname(filePath)
  if (!await exists(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
  return fs.writeFile(filePath, data)
}

export async function exists(pathLike: string): Promise<boolean> {
  try {
    await fs.stat(pathLike)
    return true
  }
  catch (error) {
    return false
  }
}

export async function copyFile(src: string, dest: string): Promise<void> {
  const dir = path.dirname(dest)
  if (!await exists(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
  return fs.copyFile(src, dest)
}

const currentPkg = require(path.join(process.cwd(), 'package.json'))
export const external = ['react', ...Object.keys(currentPkg.dependencies || {}), ...Object.keys(currentPkg.devDependencies || {})]

export async function builder(options: BuildOptions): Promise<void> {
  await build({
    bundle: true,
    format: 'esm',
    logLevel: 'silent',
    external,
    jsx: 'automatic',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    outExtension: { '.js': '.mjs' },
    ...options,
  })
}

export function injectScript(html: string, port: number): string {
  const bodyEndPosition = html.lastIndexOf('</body>')
  const injectPosition = bodyEndPosition === -1 ? html.length : bodyEndPosition
  const script = `(() => new EventSource('http://localhost:${port}').onmessage = () => location.reload())()`
  return (`${html.substring(0, injectPosition)}<script>${script}</script>\n${html.substring(injectPosition)}`)
}
