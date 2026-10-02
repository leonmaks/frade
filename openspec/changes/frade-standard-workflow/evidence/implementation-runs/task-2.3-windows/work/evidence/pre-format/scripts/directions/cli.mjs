#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { checkDirection, createDirection, planDirection } from './bootstrap.mjs'

const blocked = (code, detail) => ({ ok: false, status: 'BLOCKED', code, detail })
const [command, path, ...extra] = process.argv.slice(2)
let result
if (!['plan', 'create', 'check'].includes(command)) {
  result = {
    ok: false, status: 'NOT_IMPLEMENTED', code: 'COMMAND_NOT_IMPLEMENTED',
    detail: 'Supported: plan, create, check. Other workflow commands require later tasks.',
  }
} else if (!path || extra.length || !isAbsolute(path)) {
  result = blocked('ARGUMENTS', 'One absolute JSON request or manifest path required')
} else {
  try {
    if (command === 'check') result = await checkDirection(path)
    else {
      const request = JSON.parse(await readFile(path, 'utf8'))
      result = command === 'plan' ? await planDirection(request) : await createDirection(request)
    }
  } catch (error) { result = blocked('INPUT', error.message) }
}
process.stdout.write(`${JSON.stringify(result)}\n`)
process.exitCode = result.ok ? 0 : 2
