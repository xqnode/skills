import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {serveFiles} from './serve.mjs';
export async function checkProject(project,{browserName,allowShort=false}={}){
 const {chromium}=createRequire(path.join(project,'package.json'))('playwright-core');
 const server=await serveFiles(project);let browser;
 try{
  browser=await chromium.launch({channel:browserName||(process.platform==='win32'?'msedge':'chrome'),headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],bad=[],cancelledMedia=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>{
   const item={url:r.url(),error:r.failure()?.errorText};
   // Seeking cancels obsolete byte-range loads; real playback below must still pass.
   if(r.resourceType()==='media'&&item.error==='net::ERR_ABORTED')cancelledMedia.push(item);
   else bad.push(item);
  });
  page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()});});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>!!window.videoReady);await page.evaluate(()=>window.videoReady);
  const data=JSON.parse(fs.readFileSync(path.join(project,'timeline.json'),'utf8'));
  const captions=JSON.parse(fs.readFileSync(path.join(project,'字幕.json'),'utf8'));
  assert.deepEqual(captions.cues,data.cues,'字幕源不一致');
  assert.deepEqual(await page.evaluate(()=>window.videoTimeline),data,'页面未使用当前时间线');
  assert(allowShort||data.duration>=180,'正式整片须至少180秒；短测试请显式使用--allow-short-demo');
  const stats=await page.evaluate(()=>window.videoState());
  assert(Math.abs(stats.audioDuration-data.duration)<.03,'音频时长与时间线不符');assert.equal(stats.rate,1);
  const samples=new Set([0,data.duration-.001]);
  for(let t=0;t<data.duration;t+=.5)samples.add(t);
  for(const t of [...Object.values(data.anchors),...data.chapters.flatMap(c=>[c.start,c.end])])
   for(const d of[-.1,0,.1])samples.add(Math.max(0,Math.min(data.duration,t+d)));
  const shortCaptions=[];
  for(const [i,[a,b,text]]of data.cues.entries()){
   assert(Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&b>a&&b<=data.duration+.000001,'字幕时间异常');
   assert(!/[。，！？；：、,.!?;:…]$/.test(text),'字幕尾标点');assert(!/[“”]/.test(text),'字幕装饰引号');
   assert(!i||a>=data.cues[i-1][1]-.000001,'字幕重叠');
   if(b-a<.6)shortCaptions.push({i,text,duration:b-a});samples.add((a+b)/2);
  }
  for(const t of [...samples].sort((a,b)=>a-b))await page.evaluate(t=>{
   window.renderAt(t);window.videoAudit(t);
   const svg=document.querySelector('.stage svg'),r=svg.getBoundingClientRect(),caption=svg.querySelector('.caption');
   if(caption){const b=caption.getBoundingClientRect(),k=1920/r.width;if((b.left-r.left)*k<60||(b.right-r.left)*k>1860)throw Error('字幕超出安全边距：'+caption.textContent);}
  },t);
  for(const chapter of data.chapters){
   const t=(chapter.start+chapter.end)/2;
   const a=await page.evaluate(t=>{window.renderAt(t);return document.querySelector('.stage svg').innerHTML;},t);
   await page.evaluate(t=>window.renderAt(t),data.duration-.001);
   const b=await page.evaluate(t=>{window.renderAt(t);return document.querySelector('.stage svg').innerHTML;},t);
   assert.equal(a,b,`章节${chapter.id}跳转不确定`);
  }
  const playback=[];
  for(const t of [0,Math.max(0,data.duration*.6)]){
   await page.evaluate(t=>window.renderAt(t),t);await page.locator('#play').click();await page.waitForTimeout(1000);
   const state=await page.evaluate(()=>window.videoState());
   assert(!state.paused&&!state.muted&&state.volume>0&&state.audioTime>t+.4&&Math.abs(state.time-state.audioTime)<.15,'音频未真实播放/跳转或画面不同步');
   playback.push(state);await page.evaluate(t=>window.renderAt(t),t);
  }
  for(const width of [320,390,700]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'页面横向溢出');}
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  const report={schema:'explain-v1',duration:data.duration,minimumDurationMet:data.duration>=180,chapters:data.chapters.length,anchorCount:Object.keys(data.anchors).length,checkedFrames:samples.size,shortCaptions,playback,errors,bad,cancelledMedia,deterministic:true,passed:true,mode:allowShort?'demo':'full',humanAcceptance:'未自动判断',note:'通用技术检查与项目audit钩子；不证明讲解正确或用户已验收'};
  fs.mkdirSync(path.join(project,'output'),{recursive:true});fs.writeFileSync(path.join(project,'output/browser-check.json'),JSON.stringify(report,null,2));return report;
 }finally{await browser?.close();server.close();}
}
