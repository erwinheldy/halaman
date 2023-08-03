import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'pathe'

export const require = createRequire(import.meta.url)

export async function readDir(dir: string) {
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

export async function deleteFile(filePath: string) {
  return fs.rm(filePath, {
    recursive: true,
    force: true,
  })
}

export async function writeFile(filePath: string, data: any) {
  const dir = path.dirname(filePath)
  if (!await exists(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
  return fs.writeFile(filePath, data)
}

export async function exists(pathLike: string) {
  try {
    await fs.stat(pathLike)
    return true
  }
  catch (error) {
    return false
  }
}

export async function copyFile(src: string, dest: string) {
  const dir = path.dirname(dest)
  if (!await exists(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
  return fs.copyFile(src, dest)
}
