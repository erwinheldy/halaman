import process from 'node:process'
import path from 'pathe'
import { description, name, version } from './package.json'
import { require } from './util'

export const pkg = { description, name, version }
export const defaultPort = 3000
export const defaultStatic = 'public'

const currentPkg = require(path.join(process.cwd(), 'package.json'))
export const external = [...Object.keys(currentPkg.dependencies || {}), ...Object.keys(currentPkg.devDependencies || {})]
