import * as Influx from 'influx'

export const influx = new Influx.InfluxDB({
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
