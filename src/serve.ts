import * as express from 'express'
import { join } from 'path'
import { fs } from './fs'
import { PUBLIC_PATH } from './constants'

export function serve(): void {
  const app = express()

  app.get('/*', (req, res) => {
    try {
      const file = fs.readFileSync(join(PUBLIC_PATH, req.path))
      res.send(file)
    } catch (e) {
      if (req.path === '/main.m3u8') {
        res.send(
          [
            '#EXTM3U',
            '#EXT-X-TARGETDURATION:1',
            '#EXT-X-VERSION:3',
            '#EXT-X-MEDIA-SEQUENCE:-1',
          ].join('\n')
        )

        return
      }

      console.error(e)
    }
  })

  app.listen(3000, () => console.log('server is running...'))
}
