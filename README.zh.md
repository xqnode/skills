# Skills 仓库

## 文件索引

- [README.md](./README.md)：英文说明
- [README.zh.md](./README.zh.md)：中文说明
- [LICENSE](./LICENSE)：MIT 许可证
- [windows-inno-env-installer/](./windows-inno-env-installer)：Windows Inno 安装包打包（环境变量 + JDK 静默检测）

## 概览

本仓库存放 Windows 安装包打包相关的可复用 Agent Skill。

当前技能：

- `windows-inno-env-installer`：将 Maven 等便携目录打成 Inno Setup EXE，自动配置环境变量，无 Java 时再选装 JDK 8/21。

## 目录说明

- `windows-inno-env-installer/`：毕设环境一键安装包打包技能（含预检脚本）
- `.system/`：本地系统自带技能，已通过 Git 忽略

## 安装说明

### 官方 Skills CLI

```bash
npx skills add https://github.com/xqnode/skills --skill windows-inno-env-installer
```

安装前查看可用 skill：

```bash
npx skills add https://github.com/xqnode/skills --list
```

### Codex 手动安装

```bash
git clone https://github.com/xqnode/skills.git ~/.codex/skills
```

### Cline 手动安装

```bash
git clone https://github.com/xqnode/skills.git /tmp/xqnode-skills
mkdir -p ~/.cline/skills
cp -R /tmp/xqnode-skills/windows-inno-env-installer ~/.cline/skills/
```

### Claude Code 手动适配

```bash
git clone https://github.com/xqnode/skills.git ./.agent-skills/xqnode-skills
mkdir -p .claude/commands
cp ./.agent-skills/xqnode-skills/windows-inno-env-installer/SKILL.md .claude/commands/windows-inno-env-installer.md
```

### Cursor 手动适配

作为项目命令：

```bash
git clone https://github.com/xqnode/skills.git ./.agent-skills/xqnode-skills
mkdir -p .cursor/commands
cp ./.agent-skills/xqnode-skills/windows-inno-env-installer/SKILL.md .cursor/commands/windows-inno-env-installer.md
```

或安装为 Cursor Agent Skill：

```bash
git clone https://github.com/xqnode/skills.git /tmp/xqnode-skills
cp -R /tmp/xqnode-skills/windows-inno-env-installer ~/.cursor/skills/
```

### 兼容性说明

- `官方 Skills CLI`：推荐
- `Codex`：原生支持
- `Cline`：兼容 skill 目录结构
- `Claude Code`：建议手动适配
- `Cursor`：建议手动适配

## 说明

- 本仓库主要管理自定义、可复用的技能内容。
- `.system/` 目录下的系统技能仅保留在本地，不纳入版本控制。
- 本仓库使用 MIT License。
