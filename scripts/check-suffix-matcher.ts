import { readFileSync } from 'node:fs'
import { suffixMatcherProblem } from '../lib/suffix-matcher'

const source = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8')
const problem = suffixMatcherProblem(source)
if (problem) {
  console.error(problem)
  process.exit(1)
}
console.log('suffix-matcher: ok')
