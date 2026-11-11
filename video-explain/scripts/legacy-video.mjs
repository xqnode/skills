import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';

const args=process.argv.slice(2),action=args.shift();
function option(name,fallback){const i=args.indexOf(name);return i<0?fallback:args[i+1]}
// 静止段检测：超过 minSec 秒画面无变化的段落；超过 maxCount 处判为未通过
function motionReport(file,minSec=2,maxCount=3){
  const r=spawnSync('ffmpeg',['-hide_banner','-i',file,'-vf',`freezedetect=n=-60dB:d=${minSec}`,'-an','-f','null','-'],{encoding:'utf8',maxBuffer:64*1024*1024});
  if(r.status!==0)throw new Error(r.stderr.slice(-2000));
  const starts=[...r.stderr.matchAll(/freeze_start: ([\d.]+)/g)].map(m=>Number(m[1]));
  const durs=[...r.stderr.matchAll(/freeze_duration: ([\d.]+)/g)].map(m=>Number(m[1]));
 const totalDuration=Number(spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'}).stdout);
  const segments=starts.map((s,i)=>({start:+s.toFixed(2),duration:+(durs[i]??(totalDuration-s)).toFixed(2)})).filter(x=>Number.isFinite(x.duration));
  const total=segments.reduce((a,x)=>a+x.duration,0);
  return {rule:`静止>${minSec}s 不超过${maxCount}处`,count:segments.length,totalSeconds:+total.toFixed(1),longest:segments.reduce((a,x)=>Math.max(a,x.duration),0),passed:segments.length<=maxCount,segments,note:'只证明画面有变化，不证明动作在讲解'};
}
if(action==='motion'){
  const f=option('--file');if(!f){console.log('node video.mjs motion --file <成片.mp4>');process.exit(1)}
  const m=motionReport(path.resolve(f));console.log(JSON.stringify({...m,segments:[...m.segments].sort((a,b)=>b.duration-a.duration).slice(0,10)},null,2));process.exit(m.passed?0:2);
}
if(!['preview','check','render'].includes(action)||!option('--project')){
  console.log('node video.mjs preview|check|render --project <目录> [--browser msedge|chrome] [--fps 30] [--output output/video.mp4] [--allow-short-demo]\nnode video.mjs motion --file <成片.mp4>');process.exit(1);
}
const project=fs.realpathSync(path.resolve(option('--project'))),here=path.dirname(fileURLToPath(import.meta.url));
if(action!=='preview'){
  const preflight=spawnSync(process.env.PYTHON||'python',[path.join(here,'pipeline.py'),'timeline','--project',project],{stdio:'inherit'});
  if(preflight.status!==0)process.exit(preflight.status||1);
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.wav':'audio/wav','.mp3':'audio/mpeg','.srt':'application/x-subrip; charset=utf-8','.ttf':'font/ttf','.png':'image/png','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
  try{
    const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=fs.realpathSync(path.resolve(project,'.'+(relative==='/'?'/index.html':relative)));
    const rel=path.relative(project,file);
    if(rel.startsWith('..')||path.isAbsolute(rel)||rel.split(path.sep).some(x=>x.startsWith('.'))){res.writeHead(403).end();return}
    const stat=fs.statSync(file);
    if(!stat.isFile()){res.writeHead(404).end();return}
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/),size=stat.size;
    const start=range?Number(range[1]):0,end=range?.[2]?Math.min(Number(range[2]),size-1):size-1;
    if(req.headers.range&&(!range||start>end||start>=size)){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return}
    res.writeHead(range?206:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes','Content-Length':Math.max(0,end-start+1),...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
    if(req.method==='HEAD'||size===0){res.end();return}
    fs.createReadStream(file,{start,end}).pipe(res);
  }catch{res.writeHead(404).end()}
});
server.listen(Number(option('--port',0)),'127.0.0.1');await once(server,'listening');
const url=`http://127.0.0.1:${server.address().port}/`;
if(action==='preview'){console.log(url);await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve)});server.close();process.exit(0)}

let browser,encoder;
try{
  const require=createRequire(path.join(project,'package.json'));
  const {chromium}=require('playwright-core');
  browser=await chromium.launch({channel:option('--browser',process.platform==='win32'?'msedge':'chrome'),headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1}),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()})});
  page.on('requestfailed',r=>bad.push({url:r.url(),failure:r.failure()?.errorText}));
  await page.goto(url);await page.waitForFunction(()=>!!window.videoReady);await page.evaluate(()=>window.videoReady);
  await page.evaluate(()=>window.renderAt(0));
  const report=await page.evaluate(async()=>{
    const data=window.videoTimeline,shortCaptions=[];
    const audio=window.videoState();
    if(Math.abs(audio.audioDuration-data.duration)>.01)throw new Error(`音轨长度与时间线不一致：${audio.audioDuration} / ${data.duration}`);
    if(audio.rate!==1)throw new Error('播放器不是1倍速');
    for(const [index,[a,b,text]]of data.cues.entries()){
      if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<=a||b>data.duration+.000001||/[。，！？；：、,.!?;:…]$/.test(text)||/[“”]/.test(text))throw new Error('字幕时间、引号或尾标点异常');
      if(index&&a<data.cues[index-1][1]-.000001)throw new Error('字幕时间重叠');
      if(b-a<.6)shortCaptions.push({index,text,duration:b-a});
      window.renderAt((a+b)/2);const sub=document.querySelector('#sub');
      if(sub){const box=sub.getBBox();if(box.x<60||box.x+box.width>1860)throw new Error('字幕超出左右安全边距')}
    }
    for(let time=0;time<data.duration;time+=.05){window.renderAt(time);const local=time-data.intro;
      const n=[...document.querySelectorAll('[id^="ncr"]')].filter(e=>+e.getAttribute('width')>0).length;
      if(n>1)throw new Error('同时出现多条批注');
      data.legs.forEach(([a],i)=>{const tag=document.querySelector('#t'+i);if(tag&&+tag.getAttribute('opacity')>0&&local<a)throw new Error('标签早于动作')});
      if(data.events?.hit!==undefined&&document.querySelector('#rec')&&+document.querySelector('#rec').getAttribute('opacity')>0&&local<data.legs[1][1])throw new Error('命中早于查询完成');
      if(document.querySelector('#res')&&+document.querySelector('#res').style.opacity>0&&local<data.events.update)throw new Error('页面结果早于更新动作');
      if(document.querySelector('#okB')&&+document.querySelector('#okB').getAttribute('opacity')>0&&local<Math.max(data.events.complete,data.checks.update_end))throw new Error('最终完成标记提前');
      if(document.querySelector('#okS')&&+document.querySelector('#okS').getAttribute('opacity')>0&&local<data.legs[3][1])throw new Error('后端完成标记早于返回完成');
    }
    const time=data.duration*.72;window.renderAt(time);const before=document.querySelector('#hero').innerHTML;
    window.renderAt(data.duration*.95);window.renderAt(time);
    if(before!==document.querySelector('#hero').innerHTML)throw new Error('跳转后渲染状态不一致');
    return{duration:data.duration,cues:data.cues.length,rate:audio.rate,deterministic:true,shortCaptions,minimumDurationMet:data.duration>=180};
  });
  const out=path.join(project,'output');fs.mkdirSync(out,{recursive:true});
  for(const [i,ratio]of [.35,.58,.73,.95].entries()){
    await page.evaluate(t=>window.renderAt(t),report.duration*ratio);
    await page.locator('.stage').screenshot({path:path.join(out,`check-${i+1}.png`)});
  }
  await page.evaluate(()=>window.renderAt(0));await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForTimeout(1200);
  const playback=await page.evaluate(()=>window.videoState());
  assert(!playback.paused&&playback.audioTime>.5&&Math.abs(playback.audioTime-playback.time)<.1,'实际播放未同步');
  await page.evaluate(()=>window.renderAt(0));
  for(const width of [320,390,700]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`宽度${width}出现横向溢出`)}
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({...report,playback,errors,bad,humanAcceptance:'未自动判断'},null,2));
  if(action==='check'){console.log(JSON.stringify(report));}else{
    const fps=Number(option('--fps',30));if(!Number.isFinite(fps)||fps<1||fps>60)throw new Error('fps 应为1～60');
    const demo=args.includes('--allow-short-demo');
    if(!demo&&(report.duration<180||fps!==30))throw new Error('正式成片须至少180秒且30fps；短例或低帧率验证须显式加 --allow-short-demo 并标明demo');
    await page.setViewportSize({width:1920,height:1080});
    await page.addStyleTag({content:'.top,.transport,#player-status{display:none!important}.workspace{padding:0;max-width:none}.stage{border-radius:0;box-shadow:none}'});
    const data=await page.evaluate(()=>window.videoTimeline);
    const file=path.resolve(project,option('--output','output/video.mp4'));
    if(fs.existsSync(file))throw new Error('输出已存在，请指定新的 --output 保留旧成片');
    fs.mkdirSync(path.dirname(file),{recursive:true});
    encoder=spawn('ffmpeg',['-v','error','-n','-f','image2pipe','-framerate',String(fps),'-vcodec','png','-i','pipe:0','-i',path.resolve(project,data.audio),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',file],{stdio:['pipe','inherit','inherit']});
    const done=once(encoder,'exit'),frames=Math.ceil(report.duration*fps);
    for(let i=0;i<frames;i++){await page.evaluate(t=>window.renderAt(t),i/fps);const png=await page.locator('.stage').screenshot({type:'png'});if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');if(i%90===0)console.log(`渲染 ${i}/${frames}`)}
    encoder.stdin.end();const[code]=await done;if(code!==0)throw new Error(`编码失败 ${code}`);
    const decode=spawnSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{encoding:'utf8'});if(decode.status!==0)throw new Error(decode.stderr);
    const probe=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_name,width,height,r_frame_rate,duration','-of','json',file],{encoding:'utf8'});if(probe.status!==0)throw new Error(probe.stderr);
    const streams=JSON.parse(probe.stdout).streams,video=streams.find(s=>s.codec_name==='h264'),audio=streams.find(s=>s.codec_name==='aac');
    assert(video&&audio,'成片缺少H.264视频或AAC音轨');
    assert(video.width===1920&&video.height===1080,'成片分辨率不是1920×1080');
    const [num,den]=video.r_frame_rate.split('/').map(Number);assert(Math.abs(num/den-fps)<.001,'成片帧率不匹配');
    assert(Math.abs(Number(video.duration)-report.duration)<=1/fps+.1&&Math.abs(Number(audio.duration)-report.duration)<.15,'成片音视频长度异常');
    const motion=motionReport(file);
    fs.writeFileSync(file+'.check.json',JSON.stringify({file,fps,frames,demo,decode:'passed',streams,motion,humanAcceptance:'待用户完整听看'},null,2));console.log(file);
    if(!motion.passed)console.warn(`静止段 ${motion.count} 处、共 ${motion.totalSeconds}s，超过规则「${motion.rule}」，先补动作再交付`);
  }
}finally{if(encoder?.exitCode===null)encoder.kill();await browser?.close();server.close()}
