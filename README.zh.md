# Skills 仓库

## 文件索引

- [README.md](./README.md)：英文说明
- [README.zh.md](./README.zh.md)：中文说明
- [LICENSE](./LICENSE)：MIT 许可证
- [designgen/](./designgen)：四段式需求文档生成技能
- [graduation-project-discovery/](./graduation-project-discovery)：毕设项目第 1 阶段需求梳理技能

## 概览

这个仓库用于存放可复用的 Codex Skills，供多个项目共同使用。

当前自定义技能：

- `designgen`：用于生成面向客户确认的四段式需求文档，适合毕设类和模板化交付场景。
- `graduation-project-discovery`：用于执行毕设项目第 1 阶段的需求接入、补充确认、范围冻结和正式文档产出。

## 目录说明

- `designgen/`：需求输入文档生成技能
- `graduation-project-discovery/`：第 1 阶段需求梳理与冻结技能
- `.system/`：本地系统自带技能，已通过 Git 忽略

## 安装说明

### Codex

这是本仓库的原生格式，直接克隆到 `~/.codex/skills` 即可。

```bash
git clone https://github.com/xqnode/skills.git ~/.codex/skills
```

### Cline

Cline 支持带有 `SKILL.md` 的技能目录结构，建议将每个技能目录复制到 `~/.cline/skills/` 下。

```bash
git clone https://github.com/xqnode/skills.git /tmp/xqnode-skills
mkdir -p ~/.cline/skills
cp -R /tmp/xqnode-skills/designgen ~/.cline/skills/
cp -R /tmp/xqnode-skills/graduation-project-discovery ~/.cline/skills/
```

### Claude Code

Claude Code 不能直接原生加载 Codex 风格的 skill。最接近的复用方式是 `.claude/commands/` 下的自定义 slash commands，所以建议先克隆仓库，再把对应 `SKILL.md` 适配成命令文件。

```bash
git clone https://github.com/xqnode/skills.git ./.agent-skills/xqnode-skills
mkdir -p .claude/commands
cp ./.agent-skills/xqnode-skills/designgen/SKILL.md .claude/commands/designgen.md
cp ./.agent-skills/xqnode-skills/graduation-project-discovery/SKILL.md .claude/commands/graduation-project-discovery.md
```

### Cursor

Cursor 也不能直接原生加载 Codex 风格的 skill。最接近的复用方式是 `.cursor/commands/` 下的项目命令，所以建议先克隆仓库，再把对应 `SKILL.md` 适配成命令文件。

```bash
git clone https://github.com/xqnode/skills.git ./.agent-skills/xqnode-skills
mkdir -p .cursor/commands
cp ./.agent-skills/xqnode-skills/designgen/SKILL.md .cursor/commands/designgen.md
cp ./.agent-skills/xqnode-skills/graduation-project-discovery/SKILL.md .cursor/commands/graduation-project-discovery.md
```

### 兼容性说明

- `Codex`：原生支持
- `Cline`：兼容 skill 目录结构
- `Claude Code`：建议手动适配
- `Cursor`：建议手动适配

## 说明

- 本仓库主要管理自定义、可复用的技能内容。
- `.system/` 目录下的系统技能仅保留在本地，不纳入版本控制。
- 本仓库使用 MIT License。
