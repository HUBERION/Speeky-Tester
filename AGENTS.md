# AGENTS.md

Guidance for AI agents working in this repository.

## Repository status

**Speeky-Tester** is currently a greenfield scaffold. The only tracked file besides this document is `README.md` (title only). There is no application code, dependency manifest, test suite, lint configuration, or CI workflow yet.

## Cursor Cloud specific instructions

### Services

| Service | Required? | Notes |
|---------|-----------|-------|
| *None* | No | No dev servers, databases, or containers are defined in this repo. |

When application or test code is added, update this section with how to start each required service and which ports/URLs to use.

### Dependency installation

No package manager or language runtime is pinned by this repository yet. The VM update script is a no-op (`true`) until a manifest such as `package.json`, `pyproject.toml`, or similar is committed.

After dependencies are added, replace the update script with the appropriate install command (for example `npm install`, `pnpm install`, or `pip install -r requirements.txt`).

### Lint / test / build / run

There are no lint, test, build, or run scripts to execute today. Once tooling is added, document the standard commands here and in `README.md`. Prefer referencing `package.json` scripts, `Makefile` targets, or project docs rather than duplicating them in this file.

### Git

The repository uses `main` as the default branch. Feature branches for cloud agents should follow the pattern `cursor/<descriptive-name>-dbff`.
