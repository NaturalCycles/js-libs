import { getFetcher } from '@naturalcycles/js-lib/http'
import type { Fetcher } from '@naturalcycles/js-lib/http'
import { dimGrey } from '@naturalcycles/nodejs-lib/colors'
import type { ParsedCommit, RepoInfo } from './release.model.js'

export class GithubApi {
  constructor(
    private repo: RepoInfo,
    token: string,
  ) {
    this.fetcher = getFetcher({
      baseUrl: 'https://api.github.com',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'naturalcycles-dev-lib',
      },
    })
  }

  private fetcher: Fetcher

  /**
   * Create a GitHub Release for an existing tag. Returns the release html url.
   */
  async createRelease(input: { tag: string; notes: string; prerelease: boolean }): Promise<string> {
    const { repo } = this
    const { html_url: htmlUrl } = await this.fetcher.post<{ html_url: string }>(
      `repos/${repo.owner}/${repo.repo}/releases`,
      {
        json: {
          tag_name: input.tag,
          name: input.tag,
          body: input.notes,
          prerelease: input.prerelease,
        },
      },
    )
    return htmlUrl
  }

  /**
   * Comment on the merged PRs whose commits are part of this release.
   * Failures are logged, not thrown - comments are not worth failing a published release over.
   */
  async commentOnReleasedPrs(
    commits: ParsedCommit[],
    input: { tag: string; releaseUrl: string },
  ): Promise<void> {
    const { repo } = this
    const prNumbers = new Set<number>()

    for (const commit of commits) {
      try {
        const prs = await this.fetcher.get<{ number: number; merged_at: string | null }[]>(
          `repos/${repo.owner}/${repo.repo}/commits/${commit.hash}/pulls`,
        )
        for (const pr of prs) {
          if (pr.merged_at) prNumbers.add(pr.number)
        }
      } catch (err) {
        console.log(dimGrey(`Failed to look up PRs for commit ${commit.hash.slice(0, 7)}: ${err}`))
      }
    }

    for (const prNumber of prNumbers) {
      try {
        await this.fetcher.post(`repos/${repo.owner}/${repo.repo}/issues/${prNumber}/comments`, {
          json: {
            body: `:tada: This PR is included in [${input.tag}](${input.releaseUrl}) :tada:`,
          },
        })
        console.log(dimGrey(`Commented on PR #${prNumber}`))
      } catch (err) {
        console.log(dimGrey(`Failed to comment on PR #${prNumber}: ${err}`))
      }
    }
  }
}
