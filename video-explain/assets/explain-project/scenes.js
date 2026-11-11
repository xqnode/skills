// t 是整片绝对秒数。timeline.anchors 来自真实词时间；chapter 含 start/end/id。
// 同一舞台可跨章节使用相同对象；所有状态由 t 计算，不依赖播放历史。
// 返回SVG字符串；若提供 audit(t, context)，必须返回可序列化状态，违规时抛出错误。
export function renderScene(t, {timeline, chapter}) {
  throw new Error('先按已审核分镜实现 scenes.js；初始化不是可交付画面');
}
