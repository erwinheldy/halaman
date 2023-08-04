import esbuild from 'esbuild'
import path from 'pathe'
import { renderToStaticMarkup } from 'react-dom/server'
import { copyFile, deleteFile, exists, readDir, writeFile } from './util'
import { defaultStatic, external } from './config'

export async function build(src: string, dst: string, options?: BuildOptions) {
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
  const outdir = '.tmp'

  async function renderHTML(outfile: string) {
    const module = await import(path.resolve(outfile))
    const content = renderToStaticMarkup(module.default())
    return writeFile(`${outfile.replace(outdir, dst).slice(0, -2)}html`, options?.pretty ? await prettify(content) : content)
  }

  await esbuild.build({
    entryPoints,
    outdir,
    bundle: true,
    format: 'esm',
    logLevel: 'silent',
    jsx: 'transform',
    external,
    banner: {
      js: 'import React from \'react\';',
    },
  })

  const outputFiles = (entryPoints.map(i => `${i.replace(src, outdir).slice(0, -3)}js`))

  await Promise.all(outputFiles.map(renderHTML))

  deleteFile(outdir)
}

async function prettify(html: string) {
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

export interface BuildOptions {
  clean?: boolean
  pretty?: boolean
  static?: string
}
