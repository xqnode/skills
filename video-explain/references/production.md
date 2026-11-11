# 工具与制作命令

本文命令中的 SKILL_DIR 和 PROJECT_DIR 是占位路径，执行时换成当前skill和视频目录的绝对路径，适用于PowerShell与常见POSIX shell。不要硬编码某台机器或某个客户端安装目录。源码与安装版的同步见文末。

## 环境与凭据

Python 3.10+标准库、Node.js 20+、FFmpeg、ffprobe及浏览器。项目 `playwright-core` 固定已验证1.56.0，初始化后在视频目录执行 `npm install`。Windows默认Edge，其他系统默认Chrome，可传 `--browser chrome|msedge`。不要为了本skill更换现有项目技术。

新制作使用MiniMax `speech-2.8-hd`、`Chinese_casual_instructor_nv1`、`speed=1`，后期+6dB/-1dBFS。只读取 `MINIMAX_TOKEN_PLAN`，进程未继承时可读取同名Windows用户环境变量。用户明确选按量凭据时才修改 `api_key_env` 为 `MINIMAX_SPEECH_API_KEY`；不静默切换。缺失、余额不足或权限失败停止报告，不循环付费重试，不记录认证头。

[官方同步API](https://platform.minimax.cn/docs/api-reference/speech-t2a-http)（2026-11-11核对）：`POST https://api.minimax.cn/v1/t2a_v2`，同时检查HTTP、业务状态0和非空音频。`minimax_tts.py` 为非流式适配，请求WAV/32kHz/单声道、`subtitle_enable=true`、`subtitle_type=word`。下载原始字幕，将 `timestamped_words.time_begin/time_end` 的毫秒转秒，保留整词跨度；标准化为24kHz PCM后拼接。

离线mock不等于真实接口验证，真实请求的验证以对应项目保存的返回和试听证据为准。返回结构不同、缺词或文字归一化不一致时保存音频供试听，停止正式对齐，不均分句时间。字幕下载失败时保留已付费音频与请求缓存，先恢复/核对返回，不直接重新付费合成。

MiniMax没有本适配已核实的自由文本语气指导字段，`direction_notes`仅记设计。必须采用技术讲师的讲解风格，通过已选讲师音色、正文意群、标点、适当停顿与听审迭代落实；禁止以同事闲聊或平顺念稿代替讲解，不能仅凭音色或备注宣称已实现；详见 [voice-direction.md](voice-direction.md)。不把豆包 `context_texts` 或自然语言指导放进正文。

历史平台与案例兼容见 [legacy.md](legacy.md)，不自动重新调用。

## 初始化与试听

```text
python "SKILL_DIR/scripts/pipeline.py" init --project "PROJECT_DIR"
```

拒绝覆盖现有目录；普通init不带demo音频、字幕和时间轴，输出explain-kit通用舞台、四份制作文件和MiniMax默认配置。voice.json的draft在文稿确认后才设false；画面实现后project.json.stage才设ready。先按实际主题修改稿子、voice、scene与scenes.js，不能只换标题后输出。`稿子.txt`与分段text除空白外一致，标点也核对。研究历史案例用新目录加 `--demo`，不代表新片通过。

在视频目录安装依赖后生成代表性片段：

```text
python "SKILL_DIR/scripts/pipeline.py" audio --project "PROJECT_DIR" --sample intro
```

`intro`是示例ID。此命令会调用当前平台并产生合成用量，按本轮授权执行。sample只生成指定段，保存在 `assets/samples/`，不替换完整音轨；词时间不足仍可保留试听，但不能继续正式对齐。试听应覆盖实际术语、转折与说明，不只听音色名称。多个片段可在项目中组织试听拼接并保存来源。

## 全文、时间线与预览

```text
python "SKILL_DIR/scripts/pipeline.py" audio --project "PROJECT_DIR"
python "SKILL_DIR/scripts/pipeline.py" timeline --project "PROJECT_DIR"
node "SKILL_DIR/scripts/video.mjs" preview --project "PROJECT_DIR"
```

已有确认直接沿用，不重复询问。全文要求每段有覆盖正文的真实时间，缺失时停止，不用估算值。音量从原始PCM只处理一次，限制器补偿延迟，处理前后采样长度一致。限制峰值不等于保证自然响度，仍需实际量测和听审。

预览仅监听127.0.0.1并打印端口，点击「播放」后音频驱动画面；失败显示错误，不做无声替代动画。仅改画面按分镜源更新并重新检查，配音改变则重建所有受影响锚点、字幕和MP4。

## 名场面样片

用 `assets/explain-kit/` 的组件库和页面模板做 15～30 秒样片，配音从整片真实音轨截取，不重新合成。关键帧、联系表与导出：

```text
node "SKILL_DIR/scripts/scene.mjs" stills --page "PROJECT_DIR/样片-场景名/index.html" --every 2
node "SKILL_DIR/scripts/scene.mjs" video --page "PROJECT_DIR/样片-场景名/index.html" --output 样片-v1.mp4
```

完整流程与组件清单见 [animation-kit.md](animation-kit.md)。

## 检查与导出

```text
node "SKILL_DIR/scripts/video.mjs" check --project "PROJECT_DIR"
node "SKILL_DIR/scripts/scene.mjs" stills --page "PROJECT_DIR/index.html" --root "PROJECT_DIR" --every 2
# 逐页查看联系表、补关键词前中后帧，填写自审.md后再导出
node "SKILL_DIR/scripts/video.mjs" render --project "PROJECT_DIR" --output output/video-v1.mp4
```

新主题使用 [explain-v1协议](project-protocol.md)：scene.json声明章节、词锚点与时间约束，scenes.js实现绘图与可选audit。无需另写时间生成、渲染和检查脚本。旧网页请求协议仅在旧scene含legs且无schema时进入兼容路径。

检查资源加载、真实播放、字幕时间/引号/尾标点及左右像素边距、声明的时间约束、可选项目audit、重复跳转、手机布局，截图及报告在output。`shortCaptions`列出少于0.6秒字幕供听看检查；`minimumDurationMet`记录3分钟要求。无溢出不代表文字在手机可读。

正式render至少180秒且30fps；离线回归或短案例研究显式加 `--allow-short-demo`（仍为30fps），报告会标demo。截取 `.stage` 为1080p逐帧PNG，H.264/AAC编码。输出已存在就停止，用新版本名。失败可能留不完整文件，存在不等于成功。

导出完整解码并ffprobe核对实际流、分辨率、帧率与时长，用ffmpeg `freezedetect`（-60dB、2秒）统计静止段，一起保存到 `<视频文件>.check.json` 的 `motion`；通用整片超过3处返回失败并保留成片供诊断，不能交付为通过。样片保留警告行为。已有成片可单独检查，未通过时退出码为2：

```text
node "SKILL_DIR/scripts/video.mjs" motion --file "PROJECT_DIR/output/video-v1.mp4"
```

再实际查看最终MP4抽帧和播放；技术通过不等于音画感知同步或用户验收，见 [storyboard-review.md](storyboard-review.md)。

## 数据与缓存

| 位置 | 内容 |
| --- | --- |
| voice.json | 平台、模型、音色、语速、额外静音、增益、正文与可执行控制项 |
| scene.json | 当前主题词组锚点与视觉偏移 |
| assets/voice-cache/请求摘要/ | 原音频、实际请求、返回、原始及标准化时间，不含密钥 |
| assets/narration/配置摘要/ | 全文原音频、后期音频、拼接时间与生成配置 |
| assets/samples/配置摘要-id/ | 试听及其来源，不发布为完整音轨 |
| audio-state.json | 当前全文音轨与真实分段位置，不是验收凭证 |
| timeline.json、字幕.srt | 从当前音轨与分镜生成的数据，页面CUES同源读取 |
| output/ | 截图、技术报告、MP4与导出检查 |

缓存键包含实际合成请求。正文、标点、模型、音色、语速、情绪、句内标记与发音字典变化会产生新请求；纯段后静音和后期增益复用原缓存。全文状态绑定完整配置摘要，变更后须重新运行audio以更新拼接，不能手改recipe绕过检查。设计备注改变可更新配置但不会改变实际API参数。

纯音量后期从原音源开始，例如 `volume=6dB,alimiter=limit=0.891251:level=false:latency=true`，不能对已+6dB文件再加6dB。强限幅会改变动态，仍需听审。术语替换若使服务端返回文字与显示不同，显式设计映射后再继续，当前不猜测或伪造字时间。

## 跨平台与同步

脚本以当前文件定位资源，路径由参数传入；Windows默认Edge，其他系统默认Chrome。依赖须在当前平台可执行，浏览器不存在时显式选择已安装channel。当前回归在Windows完成，macOS/Linux尚未实机验证，不能据此宣称跨平台已验收。

唯一源版先修改、验证，再分别同步Codex和Claude安装目录。路径由操作者指定，不由脚本猜测哪个版本较新。只比较：

```text
python "SOURCE_DIR/scripts/sync_skill.py" --source "SOURCE_DIR" --target "INSTALL_DIR"
```

有差异退出2。应用前保留备份（使用不存在的新目录，且在源/目标之外）：

```text
python "SOURCE_DIR/scripts/sync_skill.py" --source "SOURCE_DIR" --target "INSTALL_DIR" --apply --backup "BACKUP_DIR"
python "SOURCE_DIR/scripts/sync_skill.py" --source "SOURCE_DIR" --target "INSTALL_DIR"
```

目标独有文件只报告不删除；有独有文件不能声称两目录完全相同。备份中的restore.json记录恢复路径与新增文件，安装目录的.video-explain-sync.json记录来源与摘要；不打包node_modules、缓存、密钥。稳定验收后由用户决定是否清理备份。

## 配音配置字段

voice.json包括provider、model、voice_id、api_key_env、speed、gain_db与segments；每段有唯一id、显示正文text、段后额外静音pause_after。MiniMax段级speed可覆盖全局speed（0.5～2），只影响该段真实请求与缓存，拼接时间记录各段实际speed。局部语速确认不自动改变全文；已确认某次试听时复用该次原音与真实时间，不把相同参数的另一遍合成当成同一音频。pause_after不包括服务端原生停顿。可选caption_max_chars默认28（12～40），只影响断句；direction_notes只记录设计，不作为已发送指令。可选synthesis_text只允许在同一正文中添加句内停顿标记，标点与显示正文须一致；emotion可在全局或分段配置。具体表达控制与试听要求见[voice-direction.md](voice-direction.md)。
