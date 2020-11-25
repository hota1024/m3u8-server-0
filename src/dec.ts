import { Decoder } from 'ts-coder'
import * as fs from 'fs'

const decoder = new Decoder({
  headSize: 4,
  isEnd(head) {
    return head[0] === 0x02
  },
})

let i = 0
decoder.onData((data) => {
  fs.writeFileSync(`out/${i}.jpg`, data)
  console.log(decoder['buffers']['length'])
  console.log(`${data.byteLength}bytes decoded`)
  i++
})

const sourceMap = [3]

sourceMap.forEach((len, i) => {
  for (let k = 0; k < len; ++k) {
    console.log(`public/${i}-${k}.ts`)
    const ts = fs.readFileSync(`public/${i}-${k}.ts`)
    decoder.push(ts)
  }
})
