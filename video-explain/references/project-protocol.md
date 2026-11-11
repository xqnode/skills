# 通用整片协议 explain-v1

新主题在音轨固定后读取。通用意味着不用重写合成、时间对齐、播放、检查和渲染脚本；文稿、分镜与绘图仍需按主题设计，不是自动将任意文稿变成动画。

## 文件和运行入口

- `project.json`：author、topic与stage；本账号默认作者为程序员青戈。画面实现完成才把draft改为ready。
- `voice.json` / `audio-state.json`：正文、合成配置与真实词时间。初始化draft=true，禁止误合成占位文稿；正文确认后设为false。
- `scene.json`：章节、词锚点、时间先后约束。
- `timeline.json` / `字幕.json` / `字幕.srt`：pipeline.py timeline同源生成，页面不另存手改CUES。
- `scenes.js`：导出renderScene(t, context)，返回SVG字符串；context包含timeline、project、chapter。所有状态由整片绝对秒数t计算。章节边界不要求清屏，不丢失共享对象。
- 可选导出audit(t, context)：检查本主题的状态先后，发现问题抛出Error，返回可序列化状态。通用检查会按0.5秒、字幕中点、章节/锚点前后调用；快速动作按项目需要加密，不声称有限采样覆盖任意时刻。
- `index.html` / `scene-entry.js` / `explain-kit.js`：默认播放器与公共绘图组件，暴露renderAt、videoReady、videoState、videoDuration、videoAudio、videoTimeline和videoAudit。

## 时间引用

scene.json最小结构：

```json
{
  "schema": "explain-v1",
  "anchors": {
    "move": {"segment": "intro", "phrase": "进入"},
    "arrive": {"segment": "intro", "phrase": "到达", "edge": "end"}
  },
  "chapters": [
    {"id": "opening", "title": "具体技术要点", "start": {"audio_start": true}, "end": {"audio_end": true}}
  ],
  "constraints": [
    {"id": "先移动再到达", "before": {"anchor": "move"}, "after": {"anchor": "arrive"}, "min_gap": 0}
  ]
}
```

以上词组仅示意，替换为实际正文中存在的词。时间来自真实词记录，不填估算绝对秒数。引用支持：

- `{ "segment": "id", "edge": "start或end" }`：整段实际起止。
- 加`phrase`定位词组；默认必须唯一，重复时显式指定从1起的`occurrence`。没有匹配必须停止，不退回估时。
- `{ "anchor": "名称", "offset": 0.2 }`引用已命名锚点；offset用于已设计的运动偏移，不替代真实发音时间。
- `{ "audio_start": true }`与`{ "audio_end": true }`覆盖音轨边界和段后停顿。
- 章节连续、不重叠地覆盖整片；章节之间的停顿归到相邻章节，不把停顿当缺失帧。
- constraints只证明声明的时间关系；模型是否看见要求、对象是否落位等语义仍须在audit及原尺寸自审中检查。

## 画面模块

```javascript
import {text, C, sm, P} from './explain-kit.js';
export function renderScene(t, {timeline, chapter}) {
  // 根据本片分镜画持续存在的角色、对象及动作；不要只换文字。
  const progress=sm(P(t,timeline.anchors.move,1));
  return text(200+progress*500,500,'当前对象',{fill:C.ink});
}
export function audit(t,{timeline}) {
  // 从同一套状态计算对象位置、结果可见性，并核对本主题约束。
  return {time:t};
}
```

示例只说明接口，不是可交付画面。没有实现audit时仅执行通用检查，不能宣称主题因果已被程序验证。

## 导出与证据

先用scene.mjs stills生成每2秒及关键词前中后帧，逐页查看联系表、原尺寸帧，完成自审.md。资源指纹绑定抽帧时加载的页面、模块、时间线、字体与音轨；修改依赖会拒绝沿用旧自审。导出入口video.mjs render会先重建时间线、做通用播放和因果钩子检查，再调用同一个scene.mjs渲染底座。

正式整片至少180秒、30fps。离线回归或短测试显式使用--allow-short-demo，报告标为demo；不能用它交付不满足约定的正式成片。输出保留版本，静止段超过3处返回失败；完整解码、时长/编码和静止段写入.check.json。检查只证明相应技术行为，仍需实际查看最终MP4抽帧和播放、让用户听看确认。
