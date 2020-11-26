import * as express from 'express'
import { join } from 'path'
import { fs } from './fs'
import { PUBLIC_PATH } from './constants'

export function serve(): void {
  const app = express()

  app.get('/*', (req, res) => {
    const file = fs.readFileSync(join(PUBLIC_PATH, req.path))
    res.send(file)
  })

  app.listen(3000, () => console.log('server is running...'))
}
