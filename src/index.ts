import * as chalk from 'chalk'
import { PUBLIC_PATH } from './constants'
import { fs } from './fs'
import { serve } from './serve'
import { update } from './update'

fs.mkdirSync(PUBLIC_PATH)

console.log(chalk.cyan('🚀 Start database watching'))
setInterval(update, 1000)

serve()
