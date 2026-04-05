---
name: designgen
description: Interview users and draft a single client-facing four-part requirement document named [项目名称]需求文档.md. Use when Codex needs to gather project requirements through short interview rounds, compress the scope, and output one readable document for client confirmation, especially for graduation projects, outsourced delivery, early scope alignment, or proposal confirmation.
---

# Designgen

Run a short interview first, then output one client-facing four-part requirement document.

## Workflow

1. Start with requirement interview instead of writing immediately.
2. Ask only 1 to 4 high-value questions per round.
3. Prioritize these interview topics: project定位, target users, roles, core modules, main flow, delivery form, scope boundary, non-goals.
4. Compress oversized ideas into a graduation-project-safe version before drafting.
5. After enough information is confirmed, draft exactly one final file named `[项目名称]需求文档.md`.
6. Write for client confirmation, not for development implementation.

## Output Rules

- Default to Chinese when the project context is Chinese.
- Write for non-technical readers first.
- Prefer short sections and direct wording.
- Keep the tone neutral, professional, and confirmable.
- The four-part template is a strict constraint, not a suggestion.
- Do not invent requirements that were not confirmed.
- If information is missing, mark it as “待确认” instead of guessing.
- Do not output `project-spec`、`db-design`、`api-contract`、`acceptance-criteria` or other internal development documents.
- The final deliverable for this skill is one file only.
- In `项目技术栈`, prefer a fixed stack style when the project is a common graduation-project web system:
  `SpringBoot + MyBatis + Hutool`, `Vue3 + Element-Plus + Vue-Router + Axios`, `MySQL`.
- If the user explicitly confirms delivery form, client type, or technical direction, that overrides the default recommended stack.
- In `项目功能描述`, organize content by role and menu/module name instead of abstract prose.
- In `项目功能描述`, keep the fixed line pattern `xx模块：xxx功能`; do not switch to paragraph prose, tables, summaries, or mixed styles.
- Do not use “平台管理员” by default. Prefer “管理员” unless the user explicitly defines a platform-side concept.
- For each role, list fixed account items first when applicable, then list module-based capabilities.
- For CRUD-style modules, use the pattern `xxx模块：管理xxx信息`.
- For non-CRUD modules, use the pattern `xxx模块：查看xxx、审核xxx` or another concise menu-style verb list.
- For statistics modules, use the pattern `数据统计：查看xxx、xxx折线图、xxx比例图`.
- For business-side and client-side roles, prefix each capability with the module/menu name and keep the wording consistent across roles.
- Module design must be specific enough to support later requirement confirmation; prefer concrete business actions, status changes, record queries, audit handling, feedback loops, and result views over vague wording such as only “查看信息” or only “管理信息”.
- Do not pad quality by mechanically adding common modules; each module must match the project's main flow, role responsibility, and graduation-project feasibility.
- In `项目创新点`, prefer grounded themes such as business closed-loop design, data statistics visualization, security design, role collaboration, or scenario landing value.
- In `可进阶的功能点`, prefer explicit expansion phrasing such as payment sandbox access, AI assistant/recommendation, evaluation system, or algorithm optimization.
- Prefer domain-specific role names such as `医生`、`卖家`、`买家`、`志愿者`、`居民` when they fit the project better than generic role labels.

## Interview Rules

- Follow [references/standard-process.md](./references/standard-process.md).
- Use [references/project-type-writing-guide.md](./references/project-type-writing-guide.md) when the project belongs to a common management-system category and you need help choosing role names or menu-style module wording.
- Use [references/graduation-project-highlight-guide.md](./references/graduation-project-highlight-guide.md) when selecting innovation points or advanced features for graduation-project-style requirement documents.
- If the user gives only a topic such as “健身房系统” or “体育竞赛系统”, do not draft immediately.
- First collect enough information to cover: project name, delivery form, roles, core modules, core flow, explicit non-goals, and client confirmation boundary.
- If the user idea is vague, ask for business direction before asking for detailed function lists.
- If the user idea is too large, proactively suggest a smaller confirmable scope.

## Final Document Shape

Use the four-part template in [references/four-part-requirement-template.md](./references/four-part-requirement-template.md).

The final structure is fixed:

- 项目技术栈
- 项目功能描述
- 项目创新点
- 可进阶的功能点

Hard constraint:

- The document must contain exactly the 4 sections above in the exact order above.
- Do not add a fifth section such as `项目简介`、`业务流程`、`非功能需求`、`数据库设计`、`接口设计` or any appendix-style section.
- Do not merge sections, rename sections, swap section order, or replace bullet lists with free-form paragraphs.
- `项目功能描述` must be written as `角色标题 + 条目列表`; module lines must use the exact style `xx模块：xxx功能`.
- The allowed freedom is to improve module quality inside the fixed template, not to alter the template itself.

The filename is fixed to `[项目名称]需求文档.md`.

When drafting `项目功能描述`, apply these default writing rules unless the user overrides them:

- 管理员：先写 `登录、个人信息、修改密码`，再按菜单列业务模块。
- 业务角色：先写 `登录`，若用户确认开放注册、认证或审核能力，再补对应固定项，固定保留 `个人信息、修改密码`，其余按菜单列业务模块。
- 客户端角色：先写 `登录、注册、个人信息、修改密码`，其余按菜单列业务模块。
- Keep each role section easy to scan, menu-oriented, and suitable for direct client confirmation.
- 控制模块密度：管理员通常比普通用户更完整；若只有 2 个角色，管理员写 6 到 8 个业务模块、用户写 4 到 6 个业务模块；若有 3 个及以上角色，非核心角色优先保留 3 到 5 个与主流程强相关的模块。
- 不要让所有角色的条目数量机械一致，模块数量应体现角色职责差异。
- 每个模块描述都应比“查看信息/管理信息”更细一层，优先写清业务动作、处理结果、状态流转、记录查询、审核反馈、统计结果中的 1 到 3 个。
- 若一个模块承担完整主流程中的关键环节，优先写成“动作 + 结果/记录”组合，例如 `预约模块：提交预约申请、查看预约进度、取消预约记录`。
- 若一个模块只剩空泛名称但缺少业务动作，优先继续追问或标记 `待确认`，不要用空模块凑数。
- If the project has a clear client-side role such as `用户`、`会员`、`学生`、`买家`、`宠物主人`, treat `收藏`、`点赞`、`评价` as optional candidate modules instead of confirmed requirements.
- Recommend `收藏` only when the client side has objects worth repeated browsing or comparison, such as 商品、课程、教师、医生、学习内容、活动.
- Recommend `点赞` only when the client side has content or objects suited for lightweight interaction, such as 学习内容、课程、活动、帖子、动态、评论.
- Recommend `评价` when users can reasonably rate or反馈 on services, content, courses, doctors, teachers, activities, or transactions.
- If these interaction modules are not explicitly confirmed, prefer asking or marking them as `待确认` rather than silently writing them into the final requirement document.

When drafting `项目创新点`, apply these default writing rules unless the user overrides them:

- 优先写 `xxx业务完整闭环`。
- 可以写 `数据统计` 与 `可视化图表展示`。
- 可以写 `xxx安全设计`，例如登录安全、权限控制、数据隔离、敏感信息保护。
- 可以按项目类型补充 `AI`、`OCR`、`消息通知`、`文件在线预览`、`音视频学习`、`评价体系` 等更贴合场景的亮点。
- 避免空泛口号，尽量让每条都能对应到系统里的具体模块或流程。
- 创新点至少 3 条，通常控制在 3 到 6 条，且至少 1 条必须和主业务流程直接相关。

When drafting `可进阶的功能点`, apply these default writing rules unless the user overrides them:

- 优先写成 `扩展实现` 或 `扩展接入` 句式。
- 可以优先考虑 `支付宝沙箱支付`、`AI聊天助手或智能推荐`、`会员评价体系`、`xxx算法` 等扩展方向。
- 也可以根据项目类型选择 `消息通知`、`文件上传与预览`、`OCR识别`、`音视频能力`、`Redis/OSS` 等方向。
- 扩展项要和本期系统主题有关，且不要与已确认的本期不做项冲突。

Before finalizing the document, run this self-check:

- 检查 `项目创新点` 是否达到 3 到 6 条，并且至少 1 条紧贴主业务流程。
- 检查 `可进阶的功能点` 是否与行业场景、当前需求范围、技术栈方向相匹配。
- 检查是否出现不贴行业的亮点，例如给学习系统写车牌识别、给社区服务系统写重交易能力。
- 检查是否出现不贴行业的角色名，优先使用行业内自然角色名称。
- 检查文档是否仍然是固定四段式，且 `项目功能描述` 是否仍然严格使用 `xx模块：xxx功能`。
- 检查模块是否写出了关键业务动作，而不是大面积停留在“查看信息”“管理信息”这种过粗表述。
- 检查是否为了凑模块数而硬塞通用模块；若不贴主流程，直接删除或改为 `待确认`。
- 检查若存在客户端角色，是否已判断 `收藏`、`点赞`、`评价` 是否适合作为候选模块；未确认时不要写成已冻结需求。
- 若发现上述问题，直接改写文档，不保留明显不合适的表述。

## Source Priority

Prefer confirmed materials in this order:

1. User's latest explicit instructions
2. Confirmed interview answers in the current session
3. Frozen requirement/spec documents
4. Earlier brainstorming notes

If sources conflict, prefer the latest confirmed version and explicitly note unresolved conflicts.
