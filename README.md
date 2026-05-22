# xqnode/skills

面向 **Windows 便携工具目录**（Maven、JDK 压缩包等）的 Agent Skill：用 **Inno Setup** 打成 **EXE 安装包**，自动配置用户级环境变量，静默检测 Java，缺 Java 时可选装 JDK 8/21。

[English](./README.en.md)

## 技能：`windows-inno-env-installer`

| 项 | 说明 |
|----|------|
| **目标** | 一次构建成功：预检 → 编译 → 产出 `dist/*-Setup.exe` |
| **安装器** | Inno Setup 6，普通用户权限（`PrivilegesRequired=lowest`） |
| **环境变量** | `MAVEN_HOME` / `JAVA_HOME` + 用户 `Path`，写 **HKCU**，无需管理员 |
| **Java** | 已有 `java -version` 则跳过 JDK 页；否则可选 JDK 21（默认）/ 8 / 不安装 |
| **附带脚本** | `preflight.ps1`（编译前检查）、`install-jdk.ps1`（Adoptium 下载模板） |

适合让 Agent 处理：打包 exe、Inno 安装包、环境变量安装器、毕设环境一键安装、避免安装器编译/运行期踩坑。

### 仓库结构

```
windows-inno-env-installer/
├── SKILL.md                 # 工作流 + ISS 易错点清单
└── scripts/
    ├── preflight.ps1        # 检查 Inno、jar、语言包等
    └── install-jdk.ps1      # JDK 下载与环境变量模板
```

本仓库提供 **技能说明与脚本**；具体项目的 `installer/*.iss`、`build-installer.bat` 需在各自工程里编写（可参考 SKILL.md 中的规则表）。

## 快速开始

### 安装技能

```bash
npx skills add https://github.com/xqnode/skills --skill windows-inno-env-installer
```

**Cursor**（推荐）：

```bash
git clone https://github.com/xqnode/skills.git %TEMP%\xqnode-skills
xcopy /E /I %TEMP%\xqnode-skills\windows-inno-env-installer %USERPROFILE%\.cursor\skills\windows-inno-env-installer
```

**Codex**：

```bash
git clone https://github.com/xqnode/skills.git ~/.codex/skills
```

### 在项目中使用

1. 将 `scripts/` 复制到项目的 `installer/scripts/`。
2. 按 `SKILL.md` 编写 `installer/app-installer.iss`（向导顺序、HKCU 环境变量、勿在 `PrepareToInstall` 检查 jar 等）。
3. 预检后编译：

```bat
powershell -File installer\scripts\preflight.ps1 -ProjectRoot .
build-installer.bat
```

## 环境要求

- 已安装 [Inno Setup 6](https://jrsoftware.org/isinfo.php)（`ISCC.exe` 可用）
- 源目录完整（如 Maven 的 `lib\` 含 `maven-*.jar`，不能只有 `.license`）
- 需要中文界面时，准备 `ChineseSimplified.isl`

## 其他客户端

| 客户端 | 安装方式 |
|--------|----------|
| **Skills CLI** | `npx skills add https://github.com/xqnode/skills --skill windows-inno-env-installer` |
| **Cline** | 复制 `windows-inno-env-installer/` 到 `~/.cline/skills/` |
| **Claude Code** | 复制 `SKILL.md` → `.claude/commands/windows-inno-env-installer.md` |
| **Cursor 命令** | 复制 `SKILL.md` → `.cursor/commands/windows-inno-env-installer.md` |

查看可用技能：`npx skills add https://github.com/xqnode/skills --list`

## 说明

- 仓库仅维护可复用的自定义 Skill，不含 `.system/` 系统技能。
- 许可证：[MIT](./LICENSE)
