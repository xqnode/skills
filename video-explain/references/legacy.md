# 历史示例与兼容

新主题使用 explain-v1；以下仅用于已有项目与离线示例复现。旧模板结构见 [template.md](template.md)，历史验收证据见 [accepted-case.md](accepted-case.md)；这些文件里的本机路径只是来源记录，不是新环境运行前提。

- `pipeline.py init --demo`复制历史网页请求示例，音轨沿用原豆包缓存；不会调用接口。
- 没有schema且含legs的旧scene.json由video.mjs分发给legacy-video.mjs，保留四路径/六步协议。新主题不可照抄。
- assets/handdrawn-project是历史示例与字体资产来源；默认init不复制其页面和场景。
- volcengine_tts.py只服务旧项目，不自动切换平台或凭据。
- 账号曾出现MiniMax 1008余额不足；这属于历史账号状态，不证明其他账号或套餐情况。当前请求检查HTTP、业务状态和有效音频，失败不循环付费重试。
- 离线mock与示例回归证明代码行为，不证明新音色合成质量；验收记录仅适用于对应音轨。
