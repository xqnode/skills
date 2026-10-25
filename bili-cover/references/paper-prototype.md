# 纸面原型

用户于 2026-10-13 认可 FastAPI「零基础入门教学」成图，并要求沉淀为可复用风格。参考图：[fastapi-paper-prototype.png](../assets/references/fastapi-paper-prototype.png)。首次使用此风格时查看该图。

## 视觉与布局

- 米白纸底参考 `#F3F0E8`，浅灰细方格仅在中央内容区，纸张质感轻微。左右裁切缓冲保持无网格的米白留白。
- 主标题采用近黑粗体无衬线中文/拉丁字体；不因参考截图含宋体而将大标题换成细宋体。小型技术文字可用等宽字体。
- 单一强调色默认淡黄 `#FFE78A`，以矩形标记衬在一个关键词后，或用于一个关键线框标签。不要把每行都加底色。
- 不放作者署名；主标题最大，中文课程名次之，底部可放一处简洁线框窗口或概念示意。
- 默认参考布局为「技术名 → 中文课程名 → 小型主题示意」。根据标题长短调整，不锁死位置、字号和分行。
- 线框采用近黑细边、以直角为主的窗口、少量浏览器圆点和箭头。内容服务于本期主题，避免密集导航、表格、统计卡片及大段小字。其他主题可用简洁结构图或用户提供的真实项目局部。
- 方格纸、纸面线框和黄色标记应形成明显风格，而不是给现有白底封面简单加纹理。避免额外便签堆叠、右侧装饰墙、斜色块和重度做旧。

## 认可案例与边界

参考案例的文字为「程序员青戈」「FastAPI」「零基础入门教学」，黄色衬底仅强调「零基础」。底部以 `GET /hello` → `{"message": "Hello World"}` 表达请求/响应，仅为教学概念示意，不是实际项目截图。

参考案例中的作者署名不再沿用。这组技术名、标题、接口和着色词是案例，不是每期固定内容。新课程采用用户确认的文字与相关示意；不自行增加营销口号或技术栈。涉及代码时使用半角直引号，生成后的代码仍须视觉检查；参考图中的弯引号不要当作可复制运行的代码。

## 提示词骨架

```text
Create a finished 16:9 Bilibili programming tutorial cover, preferably 1920x1080.
Style: paper prototype / lo-fi wireframe editorial poster, typography first.
Warm ivory paper #F3F0E8, a very faint gray square grid ONLY in the central content area,
near-black bold sans-serif headlines, one pale butter yellow accent #FFE78A.
The central 4:3 crop is x=240..1680; keep all meaningful content comfortably
inside x=312..1608 and y=54..1026. Left x=0..240 and right x=1680..1920
are blank warm ivory without grid, text or shapes. No crop guides.
Do not include an author name or signature. Begin with the course title.
Exact main title: "[技术名或主标题]", largest type.
Exact secondary title: "[用户确认的课程名]", large bold Chinese type.
Highlight ONLY "[确认的关键词]" with a pale yellow rectangle; other words stay black on ivory.
Below the title use ONE compact outlined wireframe window or sparse conceptual diagram
showing [本期相关示意], with a few large readable labels. It is a teaching diagram,
not a fabricated real project screenshot. If code is shown, use straight ASCII quotes.
All titles, labels and diagrams remain complete after a centered 4:3 crop.
Avoid dense dashboard details, extra slogans, logos, mascots, gradients, 3D,
heavy distress, and patterned side decorations. No watermark.
```

继续按技能的双比例流程检查成图与 320×240 小图。网格是此分支允许的背景；左右缓冲不放网格。裁切、中文字与示意可读性以实际成图为准。
