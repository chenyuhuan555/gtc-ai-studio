import test from 'node:test'
import assert from 'node:assert/strict'
import { usernameToInternalEmail } from '../src/authIdentity.js'

test('maps yuhuanchen to the existing Talent Graph internal email', async () => {
  assert.equal(
    await usernameToInternalEmail(' yuhuanchen '),
    '9ce03fe550a8e2ee2bfa3351cdfefa74cd2b1f4b5e74137bb6d51b0dbbbfa1cd@talent-graph.invalid',
  )
})

test('normalizes username casing and Unicode spacing', async () => {
  assert.equal(await usernameToInternalEmail(' ＹｕｈｕａｎＣｈｅｎ '), await usernameToInternalEmail('yuhuanchen'))
})

test('rejects an empty username', async () => {
  await assert.rejects(() => usernameToInternalEmail('　 '), /用户名不能为空/)
})
