'use strict'

const Base = require('bfx-facs-base')

class S3Grc extends Base {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'grc-s3'
    this._hasConf = true

    this.init()

    this.uploadS3 = this.uploadS3.bind(this)
  }

  base64MimeType (encoded) {
    if (typeof encoded !== 'string') return null
    const mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)
    if (mime && mime.length > 1) return mime[1]
    else return null
  }

  base64ParseData (encoded) {
    if (typeof encoded !== 'string') return null
    const parse = encoded.split(',')
    if (parse && parse.length > 1) return parse[1]
    else return null
  }

  base64DataCheck (encoded) {
    return this.base64MimeType(encoded) && this.base64ParseData(encoded)
  }

  parseBase64DataForS3 (encoded, filename, key) {
    const s3 = this.conf
    const header = {
      contentType: this.base64MimeType(encoded),
      acl: s3.acl,
      bucket: s3.bucket
    }
    if (filename) {
      const dispo = `${s3.contentDisposition}; filename="${filename}"`
      header.contentDisposition = dispo
    }
    if (key) header.key = key
    return [
      Buffer.from(this.base64ParseData(encoded), 'base64').toString('hex'), header
    ]
  }

  uploadS3 (data, filename, key, uid, cb) {
    if (!this.base64DataCheck(data)) {
      return cb(new Error('FACS_GRC_S3_ERROR_UPLOADED_DOCS_TYPE'))
    }

    const parsedData = this.parseBase64DataForS3(data, filename, key)

    this.caller.grc_bfx.req(
      'rest:ext:s3',
      'uploadPublic',
      parsedData,
      { timeout: 10000 },
      cb)
  }
}

module.exports = S3Grc
