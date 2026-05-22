# xqnode/skills

Reusable **Agent Skill** for packaging portable Windows tool folders (Maven, JDK bundles, etc.) into **Inno Setup EXE** installers — with user-level env vars, silent Java detection, and optional JDK 8/21 install.

[中文说明](./README.md)

## Skill: `windows-inno-env-installer`

| Item | Description |
|------|-------------|
| **Goal** | One-shot build: preflight → compile → `dist/*-Setup.exe` |
| **Installer** | Inno Setup 6, `PrivilegesRequired=lowest` |
| **Env vars** | `MAVEN_HOME` / `JAVA_HOME` + user `Path` via **HKCU** (no admin) |
| **Java** | Skip JDK UI when `java -version` works; otherwise offer JDK 21 (default) / 8 / skip |
| **Bundled scripts** | `scripts/preflight.ps1`, `scripts/install-jdk.ps1` |

Typical triggers for the agent: *package exe*, *Inno Setup*, *env var installer*, *one-click grad project environment*, *毕设环境一键安装*.

### Repository layout

```
windows-inno-env-installer/
├── SKILL.md                 # Agent workflow & ISS pitfalls checklist
└── scripts/
    ├── preflight.ps1        # Pre-compile checks (Inno, jars, language file)
    └── install-jdk.ps1      # Adoptium download + JAVA_HOME/Path (template)
```

Your project still needs its own `installer/*.iss` and `build-installer.bat`; this repo ships the **skill + scripts**, not a full Maven installer project.

## Quick start

### Install the skill

```bash
npx skills add https://github.com/xqnode/skills --skill windows-inno-env-installer
```

**Cursor** (recommended):

```bash
git clone https://github.com/xqnode/skills.git %TEMP%\xqnode-skills
xcopy /E /I %TEMP%\xqnode-skills\windows-inno-env-installer %USERPROFILE%\.cursor\skills\windows-inno-env-installer
```

**Codex**:

```bash
git clone https://github.com/xqnode/skills.git ~/.codex/skills
```

### Use in a project

1. Copy `windows-inno-env-installer/scripts/` into your `installer/scripts/`.
2. Add `installer/app-installer.iss` following rules in `SKILL.md` (wizard order, HKCU env, no `PrepareToInstall` jar checks, etc.).
3. Run preflight, then compile:

```bat
powershell -File installer\scripts\preflight.ps1 -ProjectRoot .
build-installer.bat
```

## Prerequisites

- [Inno Setup 6](https://jrsoftware.org/isinfo.php) (`ISCC.exe`)
- Complete portable source tree (e.g. Maven `lib\*.jar`, not only `.license` files)
- Optional: `ChineseSimplified.isl` for Simplified Chinese UI

## Other clients

| Client | Install |
|--------|---------|
| **Skills CLI** | `npx skills add https://github.com/xqnode/skills --skill windows-inno-env-installer` |
| **Cline** | Copy `windows-inno-env-installer/` to `~/.cline/skills/` |
| **Claude Code** | Copy `SKILL.md` → `.claude/commands/windows-inno-env-installer.md` |
| **Cursor command** | Copy `SKILL.md` → `.cursor/commands/windows-inno-env-installer.md` |

List skills: `npx skills add https://github.com/xqnode/skills --list`

## License

[MIT](./LICENSE)
