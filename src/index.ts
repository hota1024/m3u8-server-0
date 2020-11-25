import * as chalk from 'chalk'
import { join } from 'path'
import { PUBLIC_PATH } from './constants'
import { fs } from './fs'
import { serve } from './serve'
import { update } from './update'

fs.mkdirSync(PUBLIC_PATH)
fs.writeFileSync(
  join(PUBLIC_PATH, 'index.html'),
  '<!DOCTYPE html><html><body><h1>hello world</h1></body></html>'
)

console.log(chalk.cyan('🚀 Start database watching'))
setInterval(update, 1000)

serve()
