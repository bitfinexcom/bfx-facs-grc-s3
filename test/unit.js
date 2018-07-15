/* eslint-env mocha */

'use strict'

const assert = require('assert')

const S3Grc = require('../')

const ctx = {root: './test'}
const caller = {ctx: ctx}
const grcS3 = new S3Grc(caller, {}, ctx)

describe('unit testing s3 helpers', () => {
  it('starts without an error', (done) => {
    grcS3._start(next)

    function next (err) {
      assert.equal(err, null)
      grcS3._stop(done)
    }
  })

  it('Base64DataCheck should return true when data is encoded in base64 and has its MIME type attached', () => {
    const data = 'data:image/png;base64,iVBORw0KGgoAAAAUVORK5CYII='
    const check = grcS3.base64DataCheck(data)
    assert.ok(check)
  })

  it('Base64DataCheck should return false when data is encoded in base64 and has its MIME type attached', () => {
    const data = 'exampleWrongData'
    const check = grcS3.base64DataCheck(data)
    assert.ok(!check)
  })

  it('parseBase64DataForS3 should return the data ready as to upload to s3: encoded in “hex” with its content type', () => {
    const data = 'data:image/png;base64,iVBORw0KGgoAAAAUVORK5CYII='
    const hex = Buffer.from('iVBORw0KGgoAAAAUVORK5CYII=', 'base64').toString('hex')
    const res = [hex, {
      contentType: 'image/png',
      acl: grcS3.conf.acl,
      bucket: grcS3.conf.bucket
    }]
    const parse = grcS3.parseBase64DataForS3(data)
    assert.deepStrictEqual(parse, res)
  })

  it('ParseBase64DataForS3 should include contentDisposition when filename is sent', () => {
    const data = 'data:image/png;base64,iVBORw0KGgoAAAAUVORK5CYII='
    const hex = Buffer.from('iVBORw0KGgoAAAAUVORK5CYII=', 'base64').toString('hex')
    const res = [hex, {
      contentType: 'image/png',
      acl: grcS3.conf.acl,
      bucket: grcS3.conf.bucket,
      contentDisposition: 'attachment; filename="example.png"'
    }]
    const parse = grcS3.parseBase64DataForS3(data, 'example.png')
    assert.deepStrictEqual(parse, res)
  })

  it('ParseBase64DataForS3 should include s3 key when sent', () => {
    const data = 'data:image/png;base64,iVBORw0KGgoAAAAUVORK5CYII='
    const hex = Buffer.from('iVBORw0KGgoAAAAUVORK5CYII=', 'base64').toString('hex')
    const res = [hex, {
      contentType: 'image/png',
      acl: grcS3.conf.acl,
      bucket: grcS3.conf.bucket,
      contentDisposition: 'attachment; filename="example.png"',
      key: 'someKey'
    }]
    const parse = grcS3.parseBase64DataForS3(data, 'example.png', 'someKey')
    assert.deepStrictEqual(parse, res)
  })
})
