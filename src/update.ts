import * as chalk from 'chalk'
import { join } from 'path'
import { Encoder } from 'ts-coder'
import { MAX_M3U8_ITEMS, PUBLIC_PATH } from './constants'
import { fs } from './fs'
import { influx } from './influx'

const images: string[][] = []
let lastUpdatedAt = 0
let imageIndex = 0

export async function update(): Promise<void> {
  const query = `select * from jpeg_buffer where time > ${
    lastUpdatedAt * 1000000
  } LIMIT 1`
  const data = await influx.query<{ time: Date; buffer: string }>(query)

  const records = data.filter((v) => typeof v.buffer === 'string')

  if (!records.length) {
    return
  }

  console.log(`⭐ ${records.length} records found`)
  lastUpdatedAt = records[0].time.getTime() + 1

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

  let updateFirstIndex = images.length

  records.forEach((record) => {
    const buffer = Buffer.from(record.buffer, 'base64')

    const tsList = encoder.encode(buffer)
    const tsPaths: string[] = []

    tsList.forEach((ts, tsIndex) => {
      const filename = `${imageIndex}-${tsIndex}.ts`
      fs.writeFileSync(join(PUBLIC_PATH, filename), ts)

      tsPaths.push(filename)
    })

    images.push(tsPaths)
    imageIndex++
  })

  console.log(images.length)
  while (images.length > MAX_M3U8_ITEMS) {
    const paths = images[0]

    console.log(`🔥 ┌ removing ${paths.length}`)
    for (const path of paths) {
      console.log(`   ├ 🔥 removed: ${path}`)
      setTimeout(() => {
        fs.unlinkSync(join(PUBLIC_PATH, path))
      }, 1000)
    }

    updateFirstIndex--
    images.shift()
  }

  console.log('♻️ items checked')

  let sequence = 0

  for (let i = 0; i < images.length; ++i) {
    if (updateFirstIndex === i) {
      break
    }

    sequence += images[i].reduce((v) => v + 1, 0)
  }

  const m3u8Header = [
    '#EXTM3U',
    '#EXT-X-TARGETDURATION:1',
    '#EXT-X-VERSION:3',
    `#EXT-X-MEDIA-SEQUENCE:${sequence}`,
  ].join('\n')

  const m3u8Paths = images
    .map((img) => img.map((p) => `#EXTINF:1, no-desc\n${p}`).join('\n'))
    .join('\n')

  fs.writeFileSync(
    join(PUBLIC_PATH, 'main.m3u8'),
    m3u8Header + '\n\n' + m3u8Paths + '\n\n#EXTM3U'
  )

  console.log(
    chalk.green(
      `✅ ${records.length} files updated │ total ${images.length} images | seq ${sequence}`
    )
  )
}
