/**
 * GET /api/cms/git/branch-info
 *
 * Returns the current git branch, the default branch from CMS config,
 * and whether an open PR already exists for the current branch.
 *
 * Detection strategy:
 * - Development (local .git present): `git rev-parse --abbrev-ref HEAD`
 * - Netlify/production: process.env.HEAD (branch name Netlify sets)
 *
 * Response:
 * - currentBranch: string
 * - defaultBranch: string
 * - isDefaultBranch: boolean
 * - prUrl?: string — if an open PR exists for the current branch
 * - prNumber?: number
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { parseRepo } from '~/lib/cms/git-backend'
import { getCmsConfig } from '~/server/utils/config-parser-server'
import { extractAuthToken } from '~/server/utils/auth'

function makeHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
  }
}

export default defineEventHandler(async (event) => {
  const config = await getCmsConfig()
  const { owner, repo } = parseRepo(config.backend.repo)
  const defaultBranch = config.backend.branch

  // ── Detect current branch ──────────────────────────────────────────
  let currentBranch = defaultBranch

  const hasLocalGit = existsSync(`${process.cwd()}/.git`)
  if (hasLocalGit) {
    try {
      currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: process.cwd(),
        encoding: 'utf-8',
      }).trim()
    } catch {
      // Stay with defaultBranch if git command fails
    }
  } else {
    // Netlify sets HEAD to the current branch name
    currentBranch = process.env.HEAD || process.env.BRANCH || defaultBranch
  }

  // ── Check for open PR on this branch ──────────────────────────────
  let prUrl: string | undefined
  let prNumber: number | undefined

  if (currentBranch !== defaultBranch) {
    try {
      const token = extractAuthToken(event)
      if (token) {
        const prs = await $fetch<any[]>(
          `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${encodeURIComponent(currentBranch)}&state=open&per_page=5`,
          { headers: makeHeaders(token) },
        )
        if (prs.length > 0) {
          prUrl = prs[0].html_url
          prNumber = prs[0].number
        }
      }
    } catch {
      // Non-fatal: simply don't populate prUrl
    }
  }

  return {
    currentBranch,
    defaultBranch,
    isDefaultBranch: currentBranch === defaultBranch,
    prUrl,
    prNumber,
  }
})
