# xqnode/skills

可复用的 **Agent Skills** 集合。每个技能是一个独立目录，内含 `SKILL.md`（及可选的 `scripts/`、`references/`）。

[English](./README.en.md)

## 技能目录

| 技能 | 说明 | 典型触发 |
|------|------|----------|
| [`windows-inno-env-installer`](./windows-inno-env-installer/) | 便携工具目录 → Inno Setup EXE，HKCU 环境变量，可选 JDK 8/21 | 打包 exe、Inno Setup、环境变量安装器、毕设环境一键安装 |
| [`springboot-vue-thesis-builder`](./springboot-vue-thesis-builder/) | 一句话生成 Spring Boot 3.2 + Vue 3 + MySQL 毕设全栈项目 | 毕设、Spring Boot Vue、全栈生成、毕业设计、capstone |
| [`bili-cover`](./bili-cover/) | 程序员青戈的B站技术教程封面，白底大字或纸面原型，含中央4:3裁切验收 | B站封面、课程封面、纸面原型、封面改色 |

查看全部技能：

```bash
npx skills add https://github.com/xqnode/skills --list
```

## 仓库结构

```
skills/                          # 本仓库根目录
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

**约定：** 每个技能占一个顶层目录，目录名与 `SKILL.md` frontmatter 中的 `name` 一致。

## 快速安装

### Skills CLI（推荐）

```bash
# 交互选择要安装的技能
npx skills add https://github.com/xqnode/skills

# 安装单个技能
npx skills add https://github.com/xqnode/skills --skill windows-inno-env-installer
npx skills add https://github.com/xqnode/skills --skill springboot-vue-thesis-builder

# 安装全部
npx skills add https://github.com/xqnode/skills --all
```

### Cursor

```bash
git clone https://github.com/xqnode/skills.git %TEMP%\xqnode-skills

# 按需复制（示例）
xcopy /E /I %TEMP%\xqnode-skills\windows-inno-env-installer %USERPROFILE%\.cursor\skills\windows-inno-env-installer
xcopy /E /I %TEMP%\xqnode-skills\springboot-vue-thesis-builder %USERPROFILE%\.cursor\skills\springboot-vue-thesis-builder
```

### 其他客户端

| 客户端 | 安装方式 |
|--------|----------|
| **Codex** | 克隆仓库到 `~/.codex/skills/` |
| **Cline** | 复制技能目录到 `~/.cline/skills/` |
| **Claude Code** | 复制 `SKILL.md` → `.claude/commands/<skill-name>.md` |
| **Cursor 命令** | 复制 `SKILL.md` → `.cursor/commands/<skill-name>.md` |

---

## 各技能说明

### `windows-inno-env-installer`

面向 **Windows 便携工具目录**（Maven、JDK 压缩包等）：用 **Inno Setup** 打成 **EXE 安装包**，自动配置用户级环境变量，静默检测 Java，缺 Java 时可选装 JDK 8/21。

| 项 | 说明 |
|----|------|
| **目标** | 一次构建成功：预检 → 编译 → 产出 `dist/*-Setup.exe` |
| **安装器** | Inno Setup 6，普通用户权限（`PrivilegesRequired=lowest`） |
| **环境变量** | `MAVEN_HOME` / `JAVA_HOME` + 用户 `Path`，写 **HKCU**，无需管理员 |
| **附带脚本** | `preflight.ps1`（编译前检查）、`install-jdk.ps1`（Adoptium 下载模板） |

本仓库提供 **技能说明与脚本**；具体项目的 `installer/*.iss`、`build-installer.bat` 需在各自工程里编写（规则见 [SKILL.md](./windows-inno-env-installer/SKILL.md)）。

**在项目中使用：**

1. 将 `scripts/` 复制到项目的 `installer/scripts/`。
2. 按 `SKILL.md` 编写 `installer/app-installer.iss`。
3. 预检后编译：

```bat
powershell -File installer\scripts\preflight.ps1 -ProjectRoot .
build-installer.bat
```

**环境要求：** Inno Setup 6、完整源目录（如 Maven `lib\*.jar`）、可选 `ChineseSimplified.isl`。

---

### `springboot-vue-thesis-builder`

从**一句话业务描述**生成完整毕设项目：Spring Boot 3.2 + Vue 3 + MySQL，Session 鉴权，AdminLayout / FrontLayout 双端，统一 `Result` / `PageResult` API，单文件 `sql/base.sql`。

| 项 | 说明 |
|----|------|
| **工作流** | W0 脚手架 → W1 库表 → W2 后端 → W3/W4 前后端 → W5 控制台 → W6 文档 → W7 验证 |
| **技术栈** | Java 21、Boot 3.2、MyBatis-Plus、HttpSession、Vue 3 + Vite + Pinia + Element Plus |
| **使用方式** | 将 [SKILL.md](./springboot-vue-thesis-builder/SKILL.md) 全文贴入 system / rules / `CLAUDE.md` / `AGENTS.md`，用户消息只写业务需求 |
| **自主执行** | 默认不等确认，按 W0–W7 直接写代码（用户说「先别写代码」时除外） |

**示例 prompt：**

> 做一个校园二手书交易平台毕设：用户发书下单，管理员管分类和订单。

**验证：**

```bash
cd springboot && mvn -q -DskipTests compile
cd vue && npm install && npm run build
```

---

## 新增技能

1. 在仓库根目录新建 `<skill-name>/` 目录（小写、连字符，与 `name` 字段一致）。
2. 编写 `SKILL.md`，包含 YAML frontmatter（`name`、`description`）和正文说明。
3. 可选：添加 `scripts/`、`references/`、`examples.md` 等辅助文件。
4. 更新本 README 的「技能目录」表和「各技能说明」章节。
5. 本地验证：`npx skills add . --list` 应能发现新技能。

`description` 要写清**做什么**和**何时触发**，便于 Agent 自动选用。

## 说明

- 仓库仅维护可复用的自定义 Skill，不含 `.system/` 系统技能。
- 许可证：[MIT](./LICENSE)
