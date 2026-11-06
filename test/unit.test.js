'use strict'

const test = require('brittle')
const S3Grc = require('..')
const { getAsciiFileName } = require('../helpers')

const ctx = { root: './test' }
const caller = {
  ctx,
  grc_bfx: {
    req: (worker, method, opts) => {
      if (worker === 'rest:ext:s3') {
        if (method === 'getPresignedUrl') {
          const { signedUrlExpireTime } = opts[0]
          return `https://amazonaws.com?X-Amz-Expires=${signedUrlExpireTime}`
        }
      }
    }
  }
}
const grcS3 = new S3Grc(caller, {}, ctx)

const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAAUVORK5CYII='
const hex = Buffer.from('iVBORw0KGgoAAAAUVORK5CYII=', 'base64').toString('hex')

test('unit testing s3 helpers', (t) => {
  t.test('starts without an error', (t) => {
    t.plan(2)
    grcS3._start((err) => {
      t.absent(err)
      grcS3._stop((err) => t.absent(err))
    })
  })

  t.test('Base64DataCheck should return true when data is encoded in base64 and has its MIME type attached', (t) => {
    t.ok(grcS3.base64DataCheck(base64Data))
  })

  t.test('Base64DataCheck should return false when data is encoded in base64 and has its MIME type attached', (t) => {
    t.absent(grcS3.base64DataCheck('exampleWrongData'))
  })

  t.test(
    'parseBase64DataForS3 should return the data ready as to upload to s3: encoded in “hex” with its content type',
    (t) => {
      t.alike(grcS3.parseBase64DataForS3(base64Data), [hex, {
        contentType: 'image/png',
        acl: grcS3.conf.acl,
        bucket: grcS3.conf.bucket
      }])
    }
  )

  t.test('ParseBase64DataForS3 should include contentDisposition when filename is sent', (t) => {
    t.alike(grcS3.parseBase64DataForS3(base64Data, 'example.png'), [hex, {
      contentType: 'image/png',
      acl: grcS3.conf.acl,
      bucket: grcS3.conf.bucket,
      contentDisposition: 'attachment; filename="example.png"'
    }])
  })

  t.test('ParseBase64DataForS3 should include s3 key when sent', (t) => {
    t.alike(grcS3.parseBase64DataForS3(base64Data, 'example.png', 'someKey'), [hex, {
      contentType: 'image/png',
      acl: grcS3.conf.acl,
      bucket: grcS3.conf.bucket,
      contentDisposition: 'attachment; filename="example.png"',
      key: 'someKey'
    }])
  })

  t.test('Should throw an error if files is not an array', (t) => {
    t.plan(1)
    grcS3.deleteFromS3('Text', (err) => {
      t.is(err?.message, 'ERR_API_NO_files_ARR')
    })
  })

  t.test('Should throw an error if files is empty', (t) => {
    t.plan(1)
    grcS3.deleteFromS3([], (err) => {
      t.is(err?.message, 'ERR_API_EMPTY_files_ARR')
    })
  })

  t.test('Should throw an error if some file has no key ', (t) => {
    t.plan(1)
    grcS3.deleteFromS3([{ key: 'id' }, {}], (err) => {
      t.is(err?.message, 'ERR_API_NO_KEY_IN_FILE')
    })
  })
})

test('helpers: getAsciiFileName returns the same filename if it has only ASCII characters', (t) => {
  t.is(getAsciiFileName('some name.jpg'), 'some name.jpg')
})

test('helpers: getAsciiFileName strips non-ASCII characters from the name', (t) => {
  for (const filename of ['somПдтвe name.jpg', 'some na賣開始時進me.jpg']) {
    t.is(getAsciiFileName(filename), 'some name.jpg')
  }
})

test('helpers: getAsciiFileName returns "file.{extension}" if the name is all non-ASCII', (t) => {
  t.is(getAsciiFileName('賣開始時進.jpg'), 'file.jpg')
})

test('helpers: getAsciiFileName returns false if the extension has non-ASCII characters', (t) => {
  t.is(getAsciiFileName('some name.賣pg'), false)
})

test('helpers: getAsciiFileName returns false if no filename', (t) => {
  t.is(getAsciiFileName(null), false)
})

test('helpers: getAsciiFileName returns false if no extension', (t) => {
  t.is(getAsciiFileName('noextension'), false)
})

test('getDownloadUrl: signed url should return default expiry of 140', (t) => {
  const url = new URL(grcS3.getDownloadUrl('hello.txt', 'top-path'))
  t.is(url.searchParams.get('X-Amz-Expires'), '140')
})

test('getDownloadUrl: signed url should return passed expiry value', (t) => {
  const url = new URL(grcS3.getDownloadUrl('hello.txt', 'top-path', { signedUrlExpireTime: 300 }))
  t.is(url.searchParams.get('X-Amz-Expires'), '300')
})

test('getInlineUrl: signed url should return default expiry of 140', (t) => {
  const url = new URL(grcS3.getInlineUrl('hello.txt', 'top-path'))
  t.is(url.searchParams.get('X-Amz-Expires'), '140')
})

test('getInlineUrl: signed url should return passed expiry value', (t) => {
  const url = new URL(grcS3.getInlineUrl('hello.txt', 'top-path', { signedUrlExpireTime: 300 }))
  t.is(url.searchParams.get('X-Amz-Expires'), '300')
})
