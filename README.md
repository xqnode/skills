# Skills Repository

## File Index

- [README.md](./README.md): English overview
- [README.zh.md](./README.zh.md): 中文说明
- [LICENSE](./LICENSE): MIT license
- [designgen/](./designgen): Four-part requirement document generation skill
- [graduation-project-discovery/](./graduation-project-discovery): Graduation project phase-1 discovery skill

## Overview

This repository stores reusable Codex skills used across multiple projects.

Current custom skills:

- `designgen`: Generates client-facing four-part requirement documents for graduation projects and similar delivery scenarios.
- `graduation-project-discovery`: Handles phase-1 requirement intake, clarification, confirmation, and formal requirement freezing for graduation projects.

Structure:

- `designgen/`: Requirement input document generation skill
- `graduation-project-discovery/`: Phase-1 discovery and requirement-freezing skill
- `.system/`: Local system-provided skills, ignored by Git

## Installation

### Codex

Native format for this repository.

```bash
git clone https://github.com/xqnode/skills.git ~/.codex/skills
```

### Cline

Cline supports skill directories with `SKILL.md`, so copy each skill into `~/.cline/skills/`.

```bash
git clone https://github.com/xqnode/skills.git /tmp/xqnode-skills
mkdir -p ~/.cline/skills
cp -R /tmp/xqnode-skills/designgen ~/.cline/skills/
cp -R /tmp/xqnode-skills/graduation-project-discovery ~/.cline/skills/
```

### Claude Code

Claude Code does not use Codex-style skills directly. Its closest reusable format is custom slash commands in `.claude/commands/`, so install by cloning this repo and adapting the markdown files into command files.

```bash
git clone https://github.com/xqnode/skills.git ./.agent-skills/xqnode-skills
mkdir -p .claude/commands
cp ./.agent-skills/xqnode-skills/designgen/SKILL.md .claude/commands/designgen.md
cp ./.agent-skills/xqnode-skills/graduation-project-discovery/SKILL.md .claude/commands/graduation-project-discovery.md
```

### Cursor

Cursor does not load Codex-style skills directly. The closest reusable format is project commands in `.cursor/commands/`, so install by cloning this repo and adapting the markdown files into command files.

```bash
git clone https://github.com/xqnode/skills.git ./.agent-skills/xqnode-skills
mkdir -p .cursor/commands
cp ./.agent-skills/xqnode-skills/designgen/SKILL.md .cursor/commands/designgen.md
cp ./.agent-skills/xqnode-skills/graduation-project-discovery/SKILL.md .cursor/commands/graduation-project-discovery.md
```

### Notes on Compatibility

- `Codex`: native support
- `Cline`: compatible with the skill directory pattern
- `Claude Code`: manual adaptation recommended
- `Cursor`: manual adaptation recommended

Notes:

- This repository is intended to manage custom reusable skills only.
- System skills under `.system/` are kept locally and are not part of version control.
- The repository uses the MIT License.
