'use strict'

const Base = require('bfx-facs-base')
const { getAsciiFileName } = require('./helpers')

class S3Grc extends Base {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'grc-s3'
    this._hasConf = true

    this.init()

    this.uploadS3 = this.uploadS3.bind(this)
    this.getDownloadUrl = this.getDownloadUrl.bind(this)
    this.deleteFromS3 = this.deleteFromS3.bind(this)
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

    const asciiFileName = getAsciiFileName(filename)

    if (asciiFileName) {
      header.contentDisposition = `${s3.contentDisposition}; filename="${asciiFileName}"`
    }

    if (key) header.key = key

    let buffer = encoded
    if (base64) buffer = Buffer.from(this.base64ParseData(encoded), 'base64')

    return [
      buffer.toString('hex'), header
    ]
  }

  uploadS3 (data, filename, key, cb = null) {
    let parsedData = data
    const s3 = this.conf
    const worker = s3.worker || 'rest:ext:s3'

    if (this.base64DataCheck(data)) {
      parsedData = this.parseBase64DataForS3(data, filename, key)
    } else {
      parsedData = this.parseBase64DataForS3(data, filename, key, false)
    }

    return this.caller.grc_bfx.req(
      worker,
      'uploadPublic',
      parsedData,
      { timeout: 10000 },
      cb)
  }

  getDownloadUrl (filename, key, cb = null) {
    const asciiFileName = getAsciiFileName(filename)
    const responseDisposition = (asciiFileName)
      ? `attachment; filename=${asciiFileName}`
      : 'attachment'

    const signedUrlExpireTime = 120
    const s3 = this.conf
    const bucket = s3.bucket
    const worker = s3.worker || 'rest:ext:s3'

    const optsGetPresignedUrl = [{
      key, bucket, signedUrlExpireTime, responseDisposition
    }]

    return this.caller.grc_bfx.req(
      worker,
      'getPresignedUrl',
      optsGetPresignedUrl,
      { timeout: 10000 },
      cb)
  }

  deleteFromS3 (files, cb = null) {
    if (!Array.isArray(files)) {
      const err = new Error('ERR_API_NO_files_ARR')
      return cb ? cb(err) : Promise.reject(err)
    }
    if (!files.length) {
      const err = new Error('ERR_API_EMPTY_files_ARR')
      return cb ? cb(err) : Promise.reject(err)
    }

    const deleteFiles = files.map(
      file => file && file.key && { key: file.key }
    )
    if (deleteFiles.some(file => !file)) {
      const err = new Error('ERR_API_NO_KEY_IN_FILE')
      return cb ? cb(err) : Promise.reject(err)
    }

    const s3 = this.conf
    const worker = s3.worker || 'rest:ext:s3'
    const header = {
      acl: s3.acl,
      bucket: s3.bucket
    }

    const data = [deleteFiles, header]

    return this.caller.grc_bfx.req(
      worker,
      'deleteFiles',
      data,
      { timeout: 10000 },
      cb)
  }
}

module.exports = S3Grc
