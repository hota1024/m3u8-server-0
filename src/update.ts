import * as chalk from 'chalk'
import * as dayjs from 'dayjs'
import { join } from 'path'
import { Decoder, Encoder } from 'ts-coder'
import { PUBLIC_PATH } from './constants'
import { fs } from './fs'
import { influx } from './influx'

const tsPaths: string[] = []
let lastUpdatedAt = 0
let imageIndex = 0

export async function update(): Promise<void> {
  const query = `select * from jpeg_buffer where time > '${dayjs(
    lastUpdatedAt
  ).format()}'`
  const data = await influx.query<{ time: Date; buffer: string }>(query)

  const records = data.filter((v) => typeof v.buffer === 'string')

  if (!records.length) {
    return
  }

  const encoder = new Encoder({
    pid: 0x30,
    headSize: 4,
    preMap(buffer, index, buffers) {
      let status = 0x00

      if (index === buffers.length - 1) {
        status = 0x02
      }

      return Buffer.concat([Buffer.from([status, 0x00, 0x00, 0x00]), buffer])
    },
  })

  const sequence = tsPaths.length
  const decoder = new Decoder({
    headSize: 4,
    isEnd(head) {
      return head[0] === 0x02
    },
  })
  decoder.onData((data) => {
    console.log(`${data.byteLength}bytes decoded`)
  })

  records.forEach((record) => {
    const buffer = Buffer.from(record.buffer, 'base64')
    console.log('source size', buffer.byteLength)

    const tsList = encoder.encode(buffer)

    tsList.forEach((ts, tsIndex) => {
      const filename = `${imageIndex}-${tsIndex}.ts`
      tsPaths.push(filename)
      fs.writeFileSync(join(PUBLIC_PATH, filename), ts)
      decoder.push(ts)
    })
    imageIndex++
  })

  const m3u8Header = [
    '#EXTM3U',
    '#EXT-X-TARGETDURATION: 1',
    '#EXT-X-VERSION: 3',
    `#EXT-X-MEDIA-SEQUENCE: ${sequence}`,
  ].join('\n')
  const m3u8Paths = tsPaths.map((p) => `#EXTINF:1, no-desc\n${p}`).join('\n')
  fs.writeFileSync(
    join(PUBLIC_PATH, 'main.m3u8'),
    m3u8Header + '\n\n' + m3u8Paths + '\n\n#EXTM3U'
  )

  lastUpdatedAt = Date.now()
  console.log(chalk.green(`✅ ${records.length} files updated`))
}
