import { findWorkspaces } from 'find-workspaces'
import { dirname, resolve } from 'node:path'

const d = resolve('/Users/mika/Code/shared-config/packages/cspell-config')
const parent = dirname(d)

console.log(d)
console.log(parent)
const workspaces = findWorkspaces(d, {
	stopDir: parent,
})

const locations = workspaces?.map((value) => value.location) ?? []
console.log(locations)
