# xqnode/skills

A collection of reusable **Agent Skills**. Each skill is a top-level directory with `SKILL.md` (and optional `scripts/`, `references/`).

[中文说明](./README.md)

## Skill catalog

| Skill | Description | Typical triggers |
|-------|-------------|------------------|
| [`windows-inno-env-installer`](./windows-inno-env-installer/) | Portable tool folders → Inno Setup EXE, HKCU env vars, optional JDK 8/21 | package exe, Inno Setup, env var installer, one-click grad project environment |
| [`springboot-vue-thesis-builder`](./springboot-vue-thesis-builder/) | One-sentence prompts → full Spring Boot 3.2 + Vue 3 + MySQL capstone stack | thesis, capstone, Spring Boot Vue, full-stack generator, 毕设 |
| [`bili-cover`](./bili-cover/) | Chinese Bilibili tutorial covers with bold typography or paper-prototype styling and centered 4:3 crop checks | Bilibili cover, course cover, paper prototype, recolor cover |

List all skills:

```bash
npx skills add https://github.com/xqnode/skills --list
```

## Repository layout

```
skills/                          # repo root
├── README.md
├── bili-cover/
│   ├── SKILL.md
│   ├── references/
│   ├── assets/
│   └── scripts/
├── windows-inno-env-installer/
│   ├── SKILL.md
│   └── scripts/
│       ├── preflight.ps1
│       └── install-jdk.ps1
└── springboot-vue-thesis-builder/
    └── SKILL.md
```

**Convention:** one top-level directory per skill; directory name matches the `name` field in `SKILL.md` frontmatter.

## Quick install

### Skills CLI (recommended)

```bash
# Interactive picker
npx skills add https://github.com/xqnode/skills

# Single skill
npx skills add https://github.com/xqnode/skills --skill windows-inno-env-installer
npx skills add https://github.com/xqnode/skills --skill springboot-vue-thesis-builder

# All skills
npx skills add https://github.com/xqnode/skills --all
```

### Cursor

```bash
git clone https://github.com/xqnode/skills.git %TEMP%\xqnode-skills

xcopy /E /I %TEMP%\xqnode-skills\windows-inno-env-installer %USERPROFILE%\.cursor\skills\windows-inno-env-installer
xcopy /E /I %TEMP%\xqnode-skills\springboot-vue-thesis-builder %USERPROFILE%\.cursor\skills\springboot-vue-thesis-builder
```

### Other clients

| Client | Install |
|--------|---------|
| **Codex** | Clone repo to `~/.codex/skills/` |
| **Cline** | Copy skill dir to `~/.cline/skills/` |
| **Claude Code** | Copy `SKILL.md` → `.claude/commands/<skill-name>.md` |
| **Cursor command** | Copy `SKILL.md` → `.cursor/commands/<skill-name>.md` |

---

## Skill details

### `windows-inno-env-installer`

Packages portable Windows tool folders (Maven, JDK bundles, etc.) into **Inno Setup EXE** installers — user-level env vars, silent Java detection, optional JDK 8/21 install.

| Item | Description |
|------|-------------|
| **Goal** | One-shot build: preflight → compile → `dist/*-Setup.exe` |
| **Installer** | Inno Setup 6, `PrivilegesRequired=lowest` |
| **Env vars** | `MAVEN_HOME` / `JAVA_HOME` + user `Path` via **HKCU** (no admin) |
| **Bundled scripts** | `scripts/preflight.ps1`, `scripts/install-jdk.ps1` |

Your project still needs its own `installer/*.iss` and `build-installer.bat`; this repo ships the **skill + scripts** (see [SKILL.md](./windows-inno-env-installer/SKILL.md)).

**Use in a project:**

1. Copy `scripts/` into `installer/scripts/`.
2. Add `installer/app-installer.iss` following rules in `SKILL.md`.
3. Preflight, then compile:

```bat
powershell -File installer\scripts\preflight.ps1 -ProjectRoot .
build-installer.bat
```

**Prerequisites:** Inno Setup 6, complete portable source tree, optional `ChineseSimplified.isl`.

---

### `springboot-vue-thesis-builder`

Generates a full capstone project from a **one-sentence business prompt**: Spring Boot 3.2 + Vue 3 + MySQL, session auth, AdminLayout / FrontLayout, unified `Result` / `PageResult` API, single `sql/base.sql`.

| Item | Description |
|------|-------------|
| **Workflow** | W0 scaffold → W1 schema → W2 backend → W3/W4 UI → W5 dashboard → W6 docs → W7 verify |
| **Stack** | Java 21, Boot 3.2, MyBatis-Plus, HttpSession, Vue 3 + Vite + Pinia + Element Plus |
| **Usage** | Paste full [SKILL.md](./springboot-vue-thesis-builder/SKILL.md) into system / rules / `CLAUDE.md` / `AGENTS.md`; user message is business requirements only |
| **Autonomy** | Runs W0–W7 without waiting for confirmation unless user says otherwise |

**Example prompt:**

> Build a campus second-hand book marketplace: users list and order books; admins manage categories and orders.

**Verify:**

```bash
cd springboot && mvn -q -DskipTests compile
cd vue && npm install && npm run build
```

---

## Adding a new skill

1. Create `<skill-name>/` at repo root (lowercase, hyphens; same as frontmatter `name`).
2. Add `SKILL.md` with YAML frontmatter (`name`, `description`) and instructions.
3. Optionally add `scripts/`, `references/`, `examples.md`.
4. Update the catalog table and skill details in this README.
5. Verify locally: `npx skills add . --list` should discover the new skill.

Write `description` so agents know **what** the skill does and **when** to use it.

## License

[MIT](./LICENSE)
