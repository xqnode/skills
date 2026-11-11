import assert from 'node:assert/strict';
import {validateMedia} from './media-spec.mjs';
const good={streams:[{codec_type:'video',codec_name:'h264',width:1920,height:1080,r_frame_rate:'30/1',duration:'192.033333'},
 {codec_type:'audio',codec_name:'aac',duration:'192.016'}]};
assert.equal(validateMedia(good,192.016).specification,'passed');
const cases={
 '错误画幅':p=>p.streams[0].height=1000,
 '缺失音轨':p=>p.streams.pop(),
 '错误编码':p=>p.streams[1].codec_name='mp3',
 '错误帧率':p=>p.streams[0].r_frame_rate='24/1',
 '截断音轨':p=>p.streams[1].duration='180',
 '无效时长':p=>p.streams[0].duration='N/A',
 '重复音轨':p=>p.streams.push({...p.streams[1]}),
};
for(const [name,mutate]of Object.entries(cases)){
 const probe=structuredClone(good);mutate(probe);assert.throws(()=>validateMedia(probe,192.016),undefined,name);
}
console.log(JSON.stringify({passed:true,valid:1,rejected:Object.keys(cases)}));
