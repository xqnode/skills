# 动画组件库与样片工作流

做名场面样片或整片画面时读取。组件库 `assets/explain-kit/explain-kit.js` 抽自已定稿样片（`assets/examples/window-overflow/`），两者在 14 个关键帧上逐像素一致（2026-11-11 起 `pinNote` 会在文字放不下时自动加宽，示范里的「工作说明」便签由 270 变为 296 宽，修正了文字贴住边框；其余不变，`contact.png` 是加宽前的截图）。设计原则与自审清单见 [animation.md](animation.md)。

## 开始一个样片

1. 在视频目录下建 `样片-场景名/`，复制 `assets/explain-kit/scene-template.html` 为 `index.html`、`explain-kit.js` 原样复制进去。
2. 从整片真实音轨截取本段音频到 `样片-场景名/assets/audio.wav`（`ffmpeg -ss 起 -to 止 -i 整片.wav -c:a pcm_s16le`），不重新合成。
3. 从项目时间数据（例如 `full-timeline.json` 的 segments.words）取关键词的真实开始时间，填 `K`、`CUES`；`OFF` 为截取起点。
4. 先写 `动作分镜.md`（格式见 animation.md），再写 `render(T)`。
5. 生成关键帧，复制 `assets/explain-kit/自审模板.md` 为 `自审.md`，按 animation.md 第 7 节逐项自审并填写，再导出。

**时长**：样片默认 15～30 秒，只做一个名场面。指定段落更长时按完整意群做完（不截半句），最长约 45 秒；再长就拆成两个样片。

**产物位置**：样片的一切（页面、`动作分镜.md`、`自审.md`、截取的音频、关键帧、样片 MP4 与 `.check.json`）都放在 `样片-场景名/` 及其 `output/` 下。项目根的 `output/` 只放整片的检查记录与成片。

**字幕**：从当前音轨生成的字幕 JSON 读取，保留原话的「」。需要修正时改正文或字幕源规则并统一重建 JSON/SRT/CUES，不能在页面手补引号或估时间。

示例页面引用 `./explain-kit.js`；改了组件库要同步复制到样片目录。不要在样片里复制一份再私改组件——需要新组件就加到 skill 的组件库，并说明用途。

## 命令

SKILL_DIR、PROJECT_DIR替换为当前skill和视频目录的绝对路径。--every与--times可同时传入，合并定间隔帧与关键词帧；单独--times会重建本次联系表，不自动保留旧帧清单。

```text
node "SKILL_DIR/scripts/scene.mjs" stills --page "PROJECT_DIR/样片-场景名/index.html" --every 2
node "SKILL_DIR/scripts/scene.mjs" stills --page "PROJECT_DIR/样片-场景名/index.html" --every 2 --times 3.2,3.6,4.0
node "SKILL_DIR/scripts/scene.mjs" lint   --page "PROJECT_DIR/样片-场景名/index.html"
node "SKILL_DIR/scripts/scene.mjs" video  --page "PROJECT_DIR/样片-场景名/index.html" --output 样片-v1.mp4
```

- **自动画面检查（lint）**：每 0.25 秒渲染一帧，在浏览器里量出每个元素的实际位置，报告到 `output/画面检查.json`。同一问题持续 ≥0.5 秒才算（移动中一闪而过的不算）。
  - 错误（阻止导出）：文字被后画的不透明图形盖住（灰条、卡片、角色等，有效不透明度 ≥0.35、盖住 ≥25%）；两段文字重叠；清晰文字小于 22px；文字进入右上角或伸出画面左右边；非字幕元素进入字幕区（y>955）；开场 1 秒后主区域空白；**细线压字**：箭头、连线、边框等描边的已描出部分穿过文字字形；**指向错误**：箭头终点没落在它声明的 target 对象上，或 target 此时不在画面上。
  - 有意压字的删除线写 `path(...,{lint:'strike'})`，并在自审里说明；不要用它绕过真实的压字问题。
  - 警告（不阻止，但要在自审里说明）：说明文字用了浅灰 `muted`；主体高度长期不足主区域一半；页面有角色但较多帧不在场。
  - 半透明洗色（`wash`、扫描带）不算遮挡；组件库的压暗层带 `data-lint="veil"`、角色带 `data-lint="character"`，自己写的压暗层也要加 `data-lint="veil"`，否则框外内容会被误报为遮挡。
  - 它只检查能量化的问题；隐喻、因果、时序、与上一幕的连贯仍要看帧自审。图形与图形的边框相接（例如两张纸边线重叠）不在检查范围内，要靠看原尺寸帧。

- 关键帧写到 `output/stills/still-<秒>.png`，同时生成 `contact.png`（每行 3 张，每24帧分页；其余页名为contact-002.png等）和 `contact.json`（所有页及精确时间）；文件名保留三位小数。资源指纹写入 `contact.inputs.json`，已加载脚本、字体、音轨或时间线改变后须重新抽帧。
- 视频写到 `output/`，已存在会拒绝覆盖；导出后完整解码、ffprobe，并统计静止段写进 `.check.json`。
- **导出前两道门槛**：`video` 先检查自审，再跑自动画面检查，任一不过都拒绝导出。自审：会检查 `自审.md`——必须比 `index.html` 和联系表都新、十个类别（含「指向」「接触」）都写「通过」、没有「不通过」、至少列出 4 张存在的原尺寸关键帧，且「遮挡」一行写出至少 4 张逐张查过的帧名。不满足就拒绝导出（退出码 3）并列出缺什么。没有跳过开关：改了页面就重新生成关键帧、重新自审。
- 静态服务根目录默认是页面目录的上一级（字体在 `../assets/fonts`），可用 `--root` 改。
- 页面脚本报错会直接失败，不会导出空白画面。

## 组件清单

| 组件 | 用途 | 要点 |
| --- | --- | --- |
| `P / sm / eOut / eIO / eBack / pulse / span` | 时间进度与缓动 | 出现用 `eBack` 回弹，位移用 `eIO`，强调闪一下用 `pulse` |
| `rr / path / text / ellipse / rect / plateText` | 手绘图元 | `path(...,{draw})` 描画；`plateText` 带底板，压在复杂背景上用 |
| `sheet(b,x,y,w,h,opts)` | 纸片：消息、关键要求、源码、日志、工具结果、预留空白 | `wash` 大面积洗色强调；`code` 代码逐行写出；`outline` 橙色外框 |
| `tape / tapeLayout` | 纸卷与按时间排列的内容 | 新内容平滑插入；`shift(t)` 做整体推移 |
| `dropDy / pushWithAnticipation / hop` | 落下、先收再推、沿弧线跳入 | 大动作前先反向收一下 |
| `viewport / veil / edgeFlash` | 取景框、框外压暗、边沿闪烁 | 表达「范围内可见、范围外不可见」 |
| `pinNote` | 钉住的固定内容 | 不随纸卷移动 |
| `overflowBox / capacityBar / measure / stamp` | 溢出、容量、长度、强调章 | 容量 >100% 自动变橙 |
| `bracket / scanBand / circleOut / tag` | 范围、逐段检查、圈出、说明标签 | 标签 `a` 用于整体淡出 |
| `toolChip` | 工具调用卡 | 进度条 → 返回 → 跳入 |
| `arrow / checkMark / crossMark` | 指向、打勾、打叉 | 都按进度描出；箭头头部在描完时出现。`arrow` 必须写 `target`（指向对象的文字内容或 name），否则检查给警告；终点不在 target 上直接报错 |
| `path` 的 `lint / target / name` | 自己画的指向线与命名对象 | 自画曲线箭头写 `{lint:'pointer',target:'对象'}`；没有文字的对象（托盘、窗口）用 `{name:'对象'}` 起名供 target 引用；删除线写 `{lint:'strike'}` |
| `checkTag` | 清单项（保留了什么） | 勾在框内右侧，不压文字；整组淡出用 `a` |
| `emptySlot` | 空位：本该有、这次没有 | 画在容器里缺的位置，写明缺的是什么；不要把缺失物本身画进容器 |
| `bin` | 纸篓：丢弃不需要的内容 | 配合 `hop` 让内容沿弧线跳进去 |
| `press / squeezeX` | 两块压板把内容压缩 | 返回缩放比例 `k`，内容 x 用 `squeezeX` 映射；先往外退一下再合拢 |
| 窄纸片 | 表示很多条内容 | `sheet` 宽度 <90 自动画成不写字的窄条；要读字的纸片宽度 ≥100 |
| `buddy(t,lookX,opts)` | 卡通小模型 | 趴在边沿往下看；`hops` 时刻弹一下；只表现在读 |
| `chrome` | 页眉、标题、字幕 | 标题按时间切换并淡入 |
| `mountPlayer` | 播放器与导出接口 | 音频为时钟；暴露 `renderAt / videoDuration / videoAudio / videoReady` |

组件是起点不是模板：新主题先按 animation.md 第 0 节定隐喻，能复用就复用，不能就设计新对象。不要为了用上组件把主题硬塞进纸卷和取景框。

## 从样片到整片

新项目由pipeline.py init生成通用页面。把确认后的绘图函数整合到scenes.js，继续使用同一舞台与对象；scene.json定义章节和真实词锚点。用video.mjs check/render完成整片检查和导出，不另写项目渲染器。样片15—45秒是制作约定，不是scene.mjs的时长上限；整片命令默认要求至少180秒。详见[project-protocol.md](project-protocol.md)。
