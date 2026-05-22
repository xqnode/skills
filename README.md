# Skills Repository

## File Index

- [README.md](./README.md): English overview
- [README.zh.md](./README.zh.md): 中文说明
- [LICENSE](./LICENSE): MIT license
- [windows-inno-env-installer/](./windows-inno-env-installer): Windows Inno Setup EXE packager with env vars and JDK auto-install

## Overview

This repository stores reusable agent skills for Windows installer packaging.

Current skill:

- `windows-inno-env-installer`: Packages portable tools (Maven, etc.) into Inno Setup EXE installers with HKCU env configuration and silent Java/JDK handling.

Structure:

- `windows-inno-env-installer/`: Inno Setup installer build skill with preflight scripts
- `.system/`: Local system-provided skills, ignored by Git

## Installation

### Official Skills CLI

```bash
npx skills add https://github.com/xqnode/skills --skill windows-inno-env-installer
```

List available skills:

```bash
npx skills add https://github.com/xqnode/skills --list
```

### Codex Manual Install

```bash
git clone https://github.com/xqnode/skills.git ~/.codex/skills
```

### Cline Manual Install

```bash
git clone https://github.com/xqnode/skills.git /tmp/xqnode-skills
mkdir -p ~/.cline/skills
cp -R /tmp/xqnode-skills/windows-inno-env-installer ~/.cline/skills/
```

### Claude Code Manual Adaptation

```bash
git clone https://github.com/xqnode/skills.git ./.agent-skills/xqnode-skills
mkdir -p .claude/commands
cp ./.agent-skills/xqnode-skills/windows-inno-env-installer/SKILL.md .claude/commands/windows-inno-env-installer.md
```

### Cursor Manual Adaptation

As a project command:

```bash
git clone https://github.com/xqnode/skills.git ./.agent-skills/xqnode-skills
mkdir -p .cursor/commands
cp ./.agent-skills/xqnode-skills/windows-inno-env-installer/SKILL.md .cursor/commands/windows-inno-env-installer.md
```

Or install as a Cursor Agent Skill:

```bash
git clone https://github.com/xqnode/skills.git /tmp/xqnode-skills
cp -R /tmp/xqnode-skills/windows-inno-env-installer ~/.cursor/skills/
```

### Notes on Compatibility

- `Official Skills CLI`: recommended
- `Codex`: native support
- `Cline`: compatible with the skill directory pattern
- `Claude Code`: manual adaptation recommended
- `Cursor`: manual adaptation recommended

Notes:

- This repository is intended to manage custom reusable skills only.
- System skills under `.system/` are kept locally and are not part of version control.
- The repository uses the MIT License.
