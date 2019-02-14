let https = require('https')
let postcss = require('postcss')
let url = require('url')
let defaultCss = require('./defaultCss.js')

module.exports = async (req, serverRes) => {
  serverRes.setHeader('content-type', 'text/css')

  if (!req.headers.referer) {
    return defaultCss
  }

  let parsed = url.parse(req.headers.referer)
  if (!/[a-z0-9]+\.codesandbox\.io/i.test(parsed.hostname)) {
    return defaultCss
  }

  try {
    let { data } = await get(`https://${parsed.hostname}/tailwind.js`)

    eval(
      'var __tailwind_config__ = (function(module, process){' +
        data +
        ';return module.exports})({}, undefined)'
    )

    let style = '@tailwind preflight;@tailwind components;@tailwind utilities;'
    let mainCss = await get(`https://${parsed.hostname}/tailwind.css`)
    if (mainCss.headers['content-type'] === 'text/css') {
      style = mainCss.data
    }

    let { css } = await postcss([
      require('tailwindcss')(__tailwind_config__)
    ]).process(style)

    serverRes.end(css)
  } catch (err) {
    serverRes.end(defaultCss)
  }
}

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode !== 200) {
          return reject()
        }

        res.setEncoding('utf8')
        let rawData = ''

        res.on('data', chunk => {
          rawData += chunk
        })

        res.on('end', () => {
          resolve({ data: rawData, headers: res.headers })
        })
      })
      .on('error', () => {
        reject()
      })
  })
}
