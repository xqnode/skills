# 历史网页请求模板与配置

仅在维护历史网页请求案例时读取；新主题从[通用协议](project-protocol.md)开始，不复制本页协议。模板的三列、四条路径、六条批注以及 `check/query/hit/return/update/complete` 事件都是本案例的场景协议，不是通用视频模型。

## 视觉与正文

页眉只放左上角，格式为「程序员青戈 / 本节技术要点」；右上角留空。斜杠后用具体技术内容描述本节，避免「编程图解」等泛称或「上下文」这样的过宽标签。模板示例为「程序员青戈 / HTTP请求、后端查询与页面更新」，新视频按其实际内容替换。

保留可编辑SVG、文楷字体、轻微弯曲墨线和极淡纸纹。大图形配少量文字，不把口播全文铺进画面。橙蓝颜色表示动作方向；黄色只强调当前步骤，红色批注一次一条。完成路径淡化，未来标签隐藏。修改后检查1080p和手机横屏可读性。

字体附带Regular、Medium及OFL许可，来源为 [LXGW WenKai](https://github.com/lxgw/LxgwWenKai)。不删除许可、不要求安装到系统。

`index.html` 从 `timeline.json` 加载音轨与时间，`CUES` 是字幕入口；长段由 `scripts/captions.py` 从真实时间分句，去装饰引号和尾标点，同步输出SRT。正文与时间变更从配音及分镜源数据更新，不同时维护多份硬编码秒数。

`读法规则.md` 的写法见 [voice-direction.md](voice-direction.md)。语气指令必须落到实际请求，分段优先按完整意群，不用字幕长度决定配音切段。

`voice.json` 新片包含 `provider=minimax`、`model`、`voice_id`、`api_key_env`、`speed`、`gain_db`、`direction_notes`和`segments`。每段有唯一 `id`、显示正文 `text`、段后额外静音 `pause_after`；可选 `synthesis_text` 只在同一正文中加句内停顿标记；可选全局或段级 `emotion`。显示与合成正文除停顿标记和空白外必须一致，标点不忽略。

可选 `caption_max_chars` 默认28（12～40），只影响字幕拆分，不改变语速。`pause_after`不包括原生停顿。`direction_notes`不是独立语气API字段；不要把指导混进text。读音字典导致返回文字变化时需显式映射，目前工具不猜测映射。

`init --demo`从 `assets/demo/voice.json` 选历史豆包配置，与原真实时间和音频绑定；普通init从explain-project生成通用项目，不经过此历史模板。不要改历史recipe冒充新默认音色。

## 分镜锚点

```json
{"segment":"request","phrase":"发送请求","edge":"start"}
```

`segment` 为分段ID。`phrase`可选，须在该段唯一；省略时取整段第一条开始或最后一条结束。`edge`默认为 `start`，可用 `end`；`offset` 可增加明确视觉延迟。`{"audio_end":true}` 指整条音频末尾。混合记录使用完整跨度，不拆内部边界。

`scene.json`：

- `intro`：流程时间参考点。开场绘制节奏仍需按新开场长度调整。
- `phases`：步骤开始锚点，与页面 `STEPS`、`ACTIVE` 一致。
- `legs`：路径 `start`、`end`、`geometry`。示例geometry为 `[起点x,终点x,y,颜色,标签]`，只支持当前横向路径；新布局需调整绘图代码。
- `notes`：批注 `start`、`end`，与页面 `NOTES` 按序对应，窗口不重叠。
- `events`：页面命中、返回、更新和完成状态的锚点。

输出的动作时间相对 `intro`，字幕时间相对音频开头，不能重复加减开场时长。

## 历史项目维护

先确定对象、动作顺序和输入输出，再改SVG对象、路径、步骤、批注与分镜。不要保留旧事件或路径索引便声称模板已通用。

页面继续提供 `window.videoReady`、`window.videoTimeline`、`window.videoState()`、`window.renderAt(t)`及 `.stage` 截图区域。关键帧只由传入时间决定，播放器负责音频时钟和控件。检查脚本的数据库命中规则属于案例检查，新主题改走explain-v1入口，不能删除全部检查来获得通过。
