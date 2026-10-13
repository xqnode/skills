# 提示词片段

## 16:9画布与中央4:3（默认白底）

Create one finished Bilibili programming course cover, 1920x1080, white background.
The full canvas is 16:9. Its centered 4:3 crop is x=240..1680, y=0..1080.
ALL meaningful content must be inside this rectangle.
Reserve x=0..240 and x=1680..1920 as pure white empty crop buffers.
Keep all text and icons comfortably inside x=312..1608, y=54..1026.
Do not make full-width headlines. Scale the content group to fit the central 4:3 region from the start.
Do not show crop guides or safety outlines in the finished cover.
Use very heavy Chinese/Latin sans serif typography. White background, near-black text, one accent color.
Include the exact user-approved text and specify each accent word and region.

## 本次部署教程的示例文字

署名：程序员青戈
第一行：FastAPI + Vue（黑色）
第二行：服务器部署教程（只有部署为青蓝 #00A6C7，其余黑色）
标签：零基础小白版（青蓝底，白字）
技术项：Docker · Nginx · 1Panel · Ubuntu（近黑）
图标和短横线：青蓝

保持完整内容组在中央安全区内，允许合理缩小字号。这是当前示例，不是所有课程固定文案。

## 仅改颜色

Edit the user-selected original. Replace ONLY [原着色区域] from [旧色] to [新色].
Keep [黑色文字及其他元素] in their original colors.
Preserve exact text, glyphs, type sizes, positions, spacing, composition, background.
Do not recolor entire headlines, redesign, add objects, or change margins.
If the previous candidate changed the wrong elements, edit the last correct original instead.


## 纸面原型

选择 `#纸面原型` 时，用 [纸面原型](paper-prototype.md) 的提示词替代上述白底/纯白缓冲区描述；坐标与裁切规则相同，两侧改为无网格的米白留白。不要把纯白背景指令与米白纸底指令同时传入。

## 默认信息层级

不同风格均使用下列文字结构；本期用户明确指定的分行或局部修改范围优先。

```text
Place exact author "程序员青戈" at the TOP of the central safe content area, smaller than the headline.
In the MIDDLE, use TWO large headline lines:
Line 1: "[主技术栈，通常1–3个]"
Line 2: "[系统中文名称；非系统教程用确认的中文教程名]"
BELOW both headlines, render all exact technical tags "[用户给出的完整标签列表]"
in visibly smaller type, one or two rows as needed. Do not omit any supplied tag.
Keep this vertical order across visual styles. No extra slogan or third headline.
Keep every word and tag inside the central 4:3 crop with comfortable interior margins.
```
