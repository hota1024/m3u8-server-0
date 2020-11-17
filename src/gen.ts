import * as Influx from 'influx'
import { Encoder } from 'ts-coder'
import { join } from 'path'
import * as dayjs from 'dayjs'
import * as Keyv from 'keyv'
import { KeyvFile } from 'keyv-file'
import * as fs from 'fs'

const BASE_PATH = process.cwd()

const keyv = new Keyv<{
  lastUpdatedAt: number
}>({
  store: new KeyvFile({
    filename: join(BASE_PATH, 'store.json'),
  }),
})
const PUBLIC_PATH = join(BASE_PATH, 'public')

if (!fs.existsSync(PUBLIC_PATH)) {
  fs.mkdirSync(PUBLIC_PATH)
}

if (
  !fs.existsSync(join(PUBLIC_PATH, 'main.m3u8')) ||
  !fs.readFileSync(join(PUBLIC_PATH, 'main.m3u8'))
) {
  fs.writeFileSync(
    join(PUBLIC_PATH, 'main.m3u8'),
    `
#EXTM3U
#EXT-X-TARGETDURATION:1
#EXT-X-MEDIA-SEQUENCE:0
`.trim() + '\n\n'
  )
}

const influx = new Influx.InfluxDB({
  host: 'localhost',
  database: 'jpeg_buffer_db',
  schema: [
    {
      measurement: 'jpeg_buffer',
      fields: {
        buffer: Influx.FieldType.STRING,
      },
      tags: [],
    },
  ],
})

async function main() {
  const store = await keyv.get('lastUpdatedAt')
  const lastUpdatedAt = store?.lastUpdatedAt ?? 0

  const query = `select * from jpeg_buffer where time > '${dayjs(
    lastUpdatedAt
  ).format()}'`

  console.log(query)

  const data = await influx.query<{ time: Date; buffer: string }>(query)
  // keyv.set('lastUpdatedAt', { lastUpdatedAt: Date.now() })

  const records = data.filter((v) => typeof v.buffer === 'string')

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

  records.forEach((record, recordIndex) => {
    const buffer = Buffer.from(record.buffer)

    const tsList = encoder.encode(buffer)

    tsList.forEach((ts, tsIndex) => {
      const filename = `${recordIndex}-${tsIndex}.ts`
      fs.writeFileSync(join(PUBLIC_PATH, filename), ts)

      fs.appendFileSync(
        join(PUBLIC_PATH, 'main.m3u8'),
        `#EXTINF:1, no-desc\n${recordIndex}-${tsIndex}.ts\n`
      )
    })
  })
}

main()
