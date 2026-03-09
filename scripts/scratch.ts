import { findWorkspaces } from 'find-workspaces'

const workspaces = findWorkspaces()

const locations = workspaces?.map((value) => value.location) ?? []
console.log(locations)
