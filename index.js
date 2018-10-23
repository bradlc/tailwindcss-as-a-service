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

  https
    .get(`https://${parsed.hostname}/tailwind.js`, res => {
      if (res.statusCode !== 200) {
        return serverRes.end(defaultCss)
      }

      res.setEncoding('utf8')
      let rawData = ''

      res.on('data', chunk => {
        rawData += chunk
      })

      res.on('end', () => {
        try {
          eval(
            'var __tailwind_config__ = (function(module, process){' +
              rawData +
              ';return module.exports})({}, undefined)'
          )

          postcss([require('tailwindcss')(__tailwind_config__)])
            .process(
              '@tailwind preflight;@tailwind components;@tailwind utilities;'
            )
            .then(({ css }) => {
              serverRes.end(css)
            })
            .catch(() => {
              serverRes.end(defaultCss)
            })
        } catch (_) {
          serverRes.end(defaultCss)
        }
      })
    })
    .on('error', () => {
      serverRes.end(defaultCss)
    })
}
