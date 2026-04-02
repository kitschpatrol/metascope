/* eslint-disable complexity */
/* eslint-disable max-depth */
/**
 * Source for GitHub Actions workflow files.
 *
 * Discovers `.github/workflows/*.yml` and `*.yaml` files and extracts the
 * workflow name and file path from each.
 *
 * When online, enriches each workflow record with its latest run data on the
 * default branch via the GitHub REST API.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Octokit } from 'octokit'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { log } from '../log'
import { formatPath } from '../utilities/formatting'
import { getGitHubRemoteFromConfig } from '../utilities/github'
import { ensureArray } from '../utilities/template-helpers'
import { gitConfigSource } from './git-config'

// ─── Schema ─────────────────────────────────────────────────────────

const workflowRunStatus = z.enum([
	'completed',
	'in_progress',
	'pending',
	'queued',
	'requested',
	'waiting',
])

const workflowRunConclusion = z.enum([
	'action_required',
	'cancelled',
	'failure',
	'neutral',
	'skipped',
	'stale',
	'startup_failure',
	'success',
	'timed_out',
])

const githubActionSchema = z.object({
	/** Relative path to the workflow file. */
	file: z.string(),
	/** ISO 8601 timestamp of the latest completed run on the default branch. */
	lastRunAt: z.string().optional(),
	/** Conclusion of the latest run on the default branch. */
	lastRunConclusion: workflowRunConclusion.optional(),
	/** Duration of the latest run in milliseconds. */
	lastRunDurationMs: z.number().optional(),
	/** Status of the latest run on the default branch. */
	lastRunStatus: workflowRunStatus.optional(),
	/** URL of the latest run on GitHub. */
	lastRunUrl: z.string().optional(),
	/** Workflow name from the `name` field. */
	name: z.string(),
})

export type GitHubAction = z.infer<typeof githubActionSchema>

export type GitHubActionsData = OneOrMany<SourceRecord<GitHubAction>> | undefined

// ─── Run data types ─────────────────────────────────────────────────

type WorkflowRunInfo = {
	conclusion: z.infer<typeof workflowRunConclusion>
	durationMs: number | undefined
	status: z.infer<typeof workflowRunStatus>
	updatedAt: string
	url: string
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Resolve owner/repo from git config remotes in context. */
async function resolveOwnerRepo(
	context: SourceContext,
): Promise<undefined | { owner: string; repo: string }> {
	let gitRemotes = ensureArray(context.metadata?.gitConfig)
		.map((config) => config.data.remote)
		.filter((remote) => remote !== undefined)

	if (gitRemotes.length === 0 && !context.completedSources?.has('gitConfig')) {
		log.debug('Missing gitConfig in source context for githubActions, extracting it now...')
		const gitConfig = await gitConfigSource.extract(context)
		gitRemotes = ensureArray(gitConfig)
			.map((config) => config.data.remote)
			.filter((remote) => remote !== undefined)
	}

	for (const remotes of gitRemotes) {
		const result = getGitHubRemoteFromConfig(remotes)
		if (result) return result
	}

	return undefined
}

/**
 * Fetch the latest completed workflow run for each workflow on the default
 * branch. Returns a map keyed by workflow file path (e.g.
 * `.github/workflows/ci.yml`).
 */
async function fetchWorkflowRuns(
	octokit: Octokit,
	owner: string,
	repo: string,
	defaultBranch: string,
): Promise<Map<string, WorkflowRunInfo>> {
	const response = await octokit.rest.actions.listWorkflowRunsForRepo({
		branch: defaultBranch,
		owner,
		// eslint-disable-next-line ts/naming-convention
		per_page: 100,
		repo,
		status: 'completed',
	})

	// API returns newest-first — first occurrence per path is the latest run
	const runsByPath = new Map<string, WorkflowRunInfo>()
	for (const run of response.data.workflow_runs) {
		if (runsByPath.has(run.path)) continue

		let durationMs: number | undefined
		if (run.run_started_at) {
			durationMs = new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()
		}

		const conclusion = workflowRunConclusion.safeParse(run.conclusion)
		const status = workflowRunStatus.safeParse(run.status)
		if (!conclusion.success || !status.success) continue

		runsByPath.set(run.path, {
			conclusion: conclusion.data,
			durationMs,
			status: status.data,
			updatedAt: run.updated_at,
			url: run.html_url,
		})
	}

	return runsByPath
}

// ─── Source ──────────────────────────────────────────────────────────

export const githubActionsSource: MetadataSource<'githubActions'> = {
	async extract(context: SourceContext): Promise<GitHubActionsData> {
		// Step 1: Discover local workflow files
		const inputs = await getMatches(context.options, ['.github/workflows/*.{yml,yaml}'])
		if (inputs.length === 0) return undefined

		// Step 2: Parse each YAML file locally
		const records: Array<SourceRecord<GitHubAction> & { rawPath: string }> = []
		for (const input of inputs) {
			try {
				const content = await readFile(resolve(context.options.path, input), 'utf8')
				const parsed: unknown = parseYaml(content)
				if (typeof parsed !== 'object' || parsed === null || !('name' in parsed)) continue
				const { name } = parsed as Record<string, unknown>
				if (typeof name !== 'string') continue

				const file = formatPath(
					resolve(context.options.path, input),
					context.options.path,
					context.options.absolute,
				)

				records.push({
					data: githubActionSchema.parse({ file, name }),
					rawPath: input,
					source: formatPath(input, context.options.path, context.options.absolute),
				})
			} catch (error) {
				log.warn(
					`Failed to parse workflow "${input}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (records.length === 0) return undefined

		// Step 3: Enrich with run data when online
		if (context.options.offline) {
			log.debug('Skipping GitHub Actions run data (offline mode)')
		} else {
			try {
				const ownerRepo = await resolveOwnerRepo(context)
				if (ownerRepo) {
					const octokit = new Octokit(
						context.options.credentials?.githubToken
							? { auth: context.options.credentials.githubToken }
							: undefined,
					)

					// Try to reuse default branch from the github source if it already ran
					const githubData = ensureArray(context.metadata?.github)
					let defaultBranch = githubData[0]?.data.defaultBranch

					if (!defaultBranch) {
						const repoResponse = await octokit.rest.repos.get({
							owner: ownerRepo.owner,
							repo: ownerRepo.repo,
						})
						defaultBranch = repoResponse.data.default_branch
					}

					const runsByPath = await fetchWorkflowRuns(
						octokit,
						ownerRepo.owner,
						ownerRepo.repo,
						defaultBranch,
					)

					for (const record of records) {
						// Normalize to forward slashes for cross-platform matching
						const normalizedPath = record.rawPath.replaceAll('\\', '/')
						const runInfo = runsByPath.get(normalizedPath)
						if (runInfo) {
							record.data.lastRunConclusion = runInfo.conclusion
							record.data.lastRunStatus = runInfo.status
							record.data.lastRunAt = runInfo.updatedAt
							record.data.lastRunUrl = runInfo.url
							record.data.lastRunDurationMs = runInfo.durationMs
						}
					}
				}
			} catch (error) {
				log.warn(
					`Failed to fetch GitHub Actions run data: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		// Step 4: Return OneOrMany (strip internal rawPath field)
		const results: Array<SourceRecord<GitHubAction>> = records.map(
			({ rawPath: _, ...rest }) => rest,
		)
		return (results.length === 1 ? results[0] : results) as GitHubActionsData
	},
	key: 'githubActions',
	phase: 2,
}
