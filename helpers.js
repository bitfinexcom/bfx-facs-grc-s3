'use strict'

const getAsciiFileName = (filename) => {
  if (!filename) return false

  const noAscii = /[\u{0080}-\u{FFFF}]/gu
  const opts = filename.split('.')
  if (opts.length < 2) return false // No file extesion, there is no need as to get the name

  const filenameExtension = opts.pop()
  if (filenameExtension.match(noAscii)) return false // File extesion should not have no Ascii characters

  const fileName = opts.join('.').replace(noAscii, '')
  if (!fileName) return `file.${filenameExtension}`

  return `${fileName}.${filenameExtension}`
}

module.exports = {
  getAsciiFileName
}
