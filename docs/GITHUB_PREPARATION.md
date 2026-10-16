# GitHub publication proposal

**Status: prepared locally; repository creation and all pushes await user approval.**

## Proposed repository

- Owner/name: `Emmanuel2005-creator/QuizCloud`.
- Proposed visibility: **public**, for portfolio review. Visibility is not yet applied.
- Description: `A responsive trivia game built with HTML, CSS, and JavaScript, with automated tests and a future AWS static-hosting plan.`
- Proposed remote default branch: `main`.
- Local preparation branch: `codex/prepare-github`; its reviewed contents can become remote `main` after approval.
- No GitHub Pages or AWS deployment is part of this publication step.

## Duplicate and account checks

The GitHub CLI authenticated API identified `Emmanuel2005-creator`. An exact repository lookup and paginated listing of owned repositories found no existing QuizCloud repository at preparation time. Recheck immediately before creation because remote state can change.

QuizCloud initially inherited Git from the parent `Python System Health Monitor` directory, which had no remote. QuizCloud now has its own local Git repository. No parent-project files or parent Git configuration were changed. No GitHub remote has been added.

The repository-local HTTPS credential helper uses the authenticated GitHub CLI, so a future push will use the verified account. The local configuration stores a helper command, not a token. Git metadata itself is not published.

## Files proposed for publication

```text
.gitattributes
.gitignore
README.md
CHECKS.md
package.json
package-lock.json
server.js
dist/index.html
dist/styles.css
dist/questions.js
dist/game.js
dist/app.js
tests/game.test.js
tests/browser.cjs
docs/AWS_PLAN.md
docs/GITHUB_PREPARATION.md
```

`dist/` is hand-authored source and must be included. Dependencies, generated screenshots in `artifacts/`, temporary files, local environments, credentials/private keys, and infrastructure state must be excluded. Review the staged manifest and patch before publication.

## Review notes

- No production dependencies or remote application API calls. Playwright is a pinned development dependency for reproducible browser tests.
- No license has been selected. Public visibility does not itself grant an open-source license.
- Best scores are browser-local and user-editable; no trusted/shared leaderboard is claimed.
- Chrome has been tested; Firefox, Safari, physical devices, and a formal accessibility audit remain future checks.
- Repository-local commit attribution uses `Emmanuel2005-creator` and the matching GitHub no-reply email, avoiding a personal email in the commit. Authentication and commit attribution are separate settings.
- Actual checks are in `CHECKS.md`. Secret-pattern scanning is a safeguard, not a guarantee against every credential format.

## Approval boundary

After approval of public visibility and pushing these files: recheck account and repository existence, verify commit author settings, create the remote only if absent, attach that exact remote, and publish only the reviewed QuizCloud contents to `main`. If a repository appears, inspect it before proceeding; do not overwrite it or force-push.

No repository was created, no code was pushed, no public visibility was applied, and no AWS actions were taken during preparation.
