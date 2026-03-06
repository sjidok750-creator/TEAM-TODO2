# CLAUDE.md

This file provides guidance for AI assistants (Claude and others) working in
this repository. Update this file as the project evolves.

---

## Repository Overview

**Repository:** `sjidok750-creator/TEAM-TODO2`
**Status:** Newly initialized — no source code committed yet.

This repository was created empty. As development begins, update the sections
below to reflect the actual tech stack, structure, and conventions chosen.

---

## Project Structure

```
TEAM-TODO2/
├── CLAUDE.md          # This file — AI assistant guidance
└── (project files to be added)
```

Update this tree as directories and files are created.

---

## Development Setup

### Prerequisites

Document required tools here once the stack is decided. Common examples:

```bash
# Node.js projects
node --version   # required version
npm install

# Python projects
python --version
pip install -r requirements.txt

# Go projects
go version
go mod download
```

### Running the Project

```bash
# Add start/dev commands here
```

### Running Tests

```bash
# Add test commands here
```

### Linting and Formatting

```bash
# Add lint/format commands here
```

---

## Git Workflow

### Branches

- **`main`** — stable, production-ready code
- **`claude/...`** — AI assistant feature branches (auto-generated per session)
- **`feature/<name>`** — human-authored feature branches

### Commit Conventions

Use clear, imperative-style commit messages:

```
<type>: <short summary>

<optional body explaining why, not what>
```

**Types:**
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructuring without behavior change
- `docs:` — documentation only
- `test:` — adding or updating tests
- `chore:` — tooling, dependencies, config

**Examples:**
```
feat: add user authentication endpoint
fix: resolve null pointer in task creation
docs: update setup instructions in CLAUDE.md
```

### Pull Requests

- Keep PRs focused and small when possible
- Include a summary of what changed and why
- Reference relevant issues with `Fixes #<issue-number>`

---

## Code Conventions

> Update this section once the language and framework are chosen.

### General Principles

- Prefer clarity over cleverness
- Keep functions small and single-purpose
- Write code that is easy to delete, not just easy to write
- Avoid premature abstraction — add it when the pattern is clear

### Error Handling

- Handle errors at the boundary closest to the user
- Never silently swallow errors
- Log enough context to diagnose problems in production

### Testing

- Write tests for all non-trivial logic
- Prefer unit tests; add integration tests for critical paths
- Test behavior, not implementation details

---

## AI Assistant Instructions

### What to Do

- Read existing code thoroughly before suggesting changes
- Keep changes minimal and focused on the task at hand
- Follow the conventions established in this file and in the codebase
- Run lint/test commands before committing if they exist
- Commit with clear messages following the conventions above
- Push to the designated `claude/...` branch, never directly to `main`

### What to Avoid

- Do not add unnecessary abstractions, helpers, or utilities
- Do not refactor code that wasn't part of the task
- Do not add comments that restate what the code obviously does
- Do not introduce dependencies without explicit need
- Do not push to `main` or other protected branches

### Branch Naming

AI assistant branches follow this pattern:
```
claude/<session-description>-<session-id>
```

Always develop on the branch specified at the start of the session.

---

## Updating This File

This file should evolve with the project. When making significant changes,
update the relevant sections:

- After choosing a tech stack → update **Project Structure** and **Development Setup**
- After establishing code patterns → update **Code Conventions**
- After adding CI/CD → document it here
- After adding a database → document schema locations and migration workflow
- After adding APIs → document endpoint conventions and authentication

Keep this file accurate and concise. Remove placeholder sections once
real content replaces them.
