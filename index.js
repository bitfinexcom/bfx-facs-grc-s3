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

  parseBase64DataForS3 (encoded, filename, key, base64 = true) {
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

    let buffer = encoded
    if (base64) buffer = Buffer.from(this.base64ParseData(encoded), 'base64')

    return [
      buffer.toString('hex'), header
    ]
  }

  uploadS3 (data, filename, key, cb) {
    let parsedData = data

    if (this.base64DataCheck(data)) {
      parsedData = this.parseBase64DataForS3(data, filename, key)
    } else {
      parsedData = this.parseBase64DataForS3(data, filename, key, false)
    }

    this.caller.grc_bfx.req(
      'rest:ext:s3',
      'uploadPublic',
      parsedData,
      { timeout: 10000 },
      cb)
  }

  getDownloadUrl (filename, key, cb) {
    const responseDisposition = `attachment; filename=${filename}`
    const signedUrlExpireTime = 120

    const optsGetPresignedUrl = [{
      key, signedUrlExpireTime, responseDisposition
    }]

    this.caller.grc_bfx.req(
      'rest:ext:s3',
      'getPresignedUrl',
      optsGetPresignedUrl,
      { timeout: 10000 },
      cb)
  }

  deleteFromS3 (files, cb) {
    if (!Array.isArray(files)) return cb(new Error('ERR_API_NO_files_ARR'))
    if (!files.length) return cb(new Error('ERR_API_EMPTY_files_ARR'))

    const deleteFiles = files.map(
      file => file && file.key && { key: file.key }
    )
    if (
      deleteFiles.some(file => !file)
    ) return cb(new Error('ERR_API_NO_KEY_IN_FILE'))

    const s3 = this.conf
    const header = {
      acl: s3.acl,
      bucket: s3.bucket
    }

    const data = [deleteFiles, header]

    this.caller.grc_bfx.req(
      'rest:ext:s3',
      'deleteFiles',
      data,
      { timeout: 10000 },
      cb)
  }
}

module.exports = S3Grc
