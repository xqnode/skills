import assert from 'node:assert/strict';

// Validate the encoded artifact, independently of browser/CSS assumptions.
export function validateMedia(probe,duration,fps=30){
 const vs=probe.streams.filter(s=>s.codec_type==='video'),as=probe.streams.filter(s=>s.codec_type==='audio');
 assert.equal(vs.length,1,'成片须恰有一路视频');assert.equal(as.length,1,'成片须恰有一路音频');
 assert.equal(vs[0].codec_name,'h264');assert.equal(as[0].codec_name,'aac');
 assert.equal(vs[0].width,1920);assert.equal(vs[0].height,1080);
 const [num,den]=vs[0].r_frame_rate.split('/').map(Number);assert.equal(num/den,fps,'成片帧率不符');
 for(const stream of [vs[0],as[0]])assert(Number.isFinite(Number(stream.duration))&&Math.abs(Number(stream.duration)-duration)<.15,'成片流时长与时间线不符');
 assert(Math.abs(Number(vs[0].duration)-Number(as[0].duration))<.15,'成片音视频时长不一致');
 return {specification:'passed',expectedDuration:duration};
}
