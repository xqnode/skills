// 单场景/样片的关键帧、联系表、导出与静止段检查。页面需用 explain-kit 的 mountPlayer（提供 renderAt/videoDuration/videoAudio）。
// 用法：
//   node scene.mjs stills --page <index.html> [--times 1,4.5,9] [--every 2] [--root <静态根目录>]
//        → <页面目录>/output/stills/still-<秒>.png 和 contact.png（联系表，左上到右下按时间排列）
//   node scene.mjs lint   --page <index.html> [--every 0.25] [--report 报告.json]
//        → 自动画面检查（遮挡、文字重叠、字号、越界、空白、角色在场），写 <页面目录>/output/画面检查.json；有错误时退出码 4
//   node scene.mjs video  --page <index.html> --output <文件名.mp4> [--root ...]
//        → 先过自审门槛与自动画面检查，再导出到 <页面目录>/output/<文件名>；已存在则拒绝覆盖；导出后完整解码、ffprobe 并统计静止段，写 .check.json
// --root 默认为页面目录的上一级（页面常用 ../assets/fonts 引用字体）。需要 playwright-core（视频根目录或上级 node_modules）与 ffmpeg。
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {validateMedia} from './media-spec.mjs';
import {serveFiles} from './serve.mjs';

const [mode,...rest]=process.argv.slice(2);
const opt=(k,d)=>{const i=rest.indexOf(k);return i<0?d:rest[i+1]};
if(!['stills','video','lint'].includes(mode)||!opt('--page')){console.log('node scene.mjs stills|lint|video --page <index.html> [--times a,b] [--every 秒] [--output x.mp4] [--report 报告.json] [--root 目录] [--browser msedge|chrome]');process.exit(1)}
const page=path.resolve(opt('--page')),pageDir=path.dirname(page),root=path.resolve(opt('--root',path.dirname(pageDir)));
if(!page.startsWith(root+path.sep))throw new Error('--page 必须位于 --root 之内');
// 自审硬门槛：导出视频前必须有比页面和联系表都新的、填完的 自审.md（模板：assets/explain-kit/自审模板.md）
function reviewGate(){
 const review=path.join(pageDir,'自审.md'),contact=path.join(pageDir,'output','stills','contact.png'),problems=[];
 const mt=f=>fs.existsSync(f)?fs.statSync(f).mtimeMs:-1;
 const inputs=path.join(pageDir,'output/stills/contact.inputs.json');
 if(!fs.existsSync(inputs))problems.push('缺少资源指纹：重新生成关键帧');
 else for(const entry of JSON.parse(fs.readFileSync(inputs,'utf8')).files){
  const f=path.resolve(root,entry.path);
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||createHash('sha256').update(fs.readFileSync(f)).digest('hex')!==entry.sha256)
   problems.push('画面依赖已改变，重新抽帧并自审：'+entry.path);
 }

 if(mt(contact)<0)problems.push('缺少联系表：先运行 stills 生成 output/stills/contact.png');
 else if(mt(contact)<mt(page))problems.push('联系表比 index.html 旧：改了页面后要重新生成关键帧');
 if(mt(review)<0)problems.push('缺少 自审.md：复制 assets/explain-kit/自审模板.md 并逐项填写');
 else{
  if(mt(review)<mt(page)||mt(review)<mt(contact))problems.push('自审.md 比页面或联系表旧：看过最新关键帧后重新填写');
  const s=fs.readFileSync(review,'utf8'),lines=s.split(/\r?\n/);
  for(const c of['因果','时序','事实','构图','遮挡','指向','接触','可读性','风格','字幕'])if(!lines.some(l=>l.includes(c)&&/通过/.test(l)&&!/不通过|待填/.test(l)))problems.push(`失败清单「${c}」没有写成「通过」`);
  if(/不通过/.test(s))problems.push('自审.md 里还有「不通过」：先改完再导出');
  const seen=new Set((s.match(/still-\d+(?:\.\d+)?\.png/g)||[]).filter(f=>fs.existsSync(path.join(pageDir,'output','stills',f))));
  if(seen.size<4)problems.push(`自审.md 只列出 ${seen.size} 张存在的原尺寸关键帧，至少需要 4 张`);
  const occl=lines.find(l=>l.includes('遮挡')&&/通过/.test(l))||'',occlSeen=new Set(occl.match(/still-\d+(?:\.\d+)?\.png/g)||[]);
  if(occlSeen.size<4)problems.push(`「遮挡」一行只写了 ${occlSeen.size} 张逐张查过的原尺寸帧名，至少需要 4 张（联系表缩略图不算）`);
 }
 if(problems.length){console.error('导出前自审未完成：\n- '+problems.join('\n- '));process.exit(3)}
}
if(mode==='video')reviewGate();

const req=createRequire(path.join(pageDir,'x.js'));let chromium;
try{({chromium}=req('playwright-core'))}catch{try{({chromium}=createRequire(path.join(process.cwd(),'x.js'))('playwright-core'))}catch{throw new Error('找不到 playwright-core：在视频根目录 npm install playwright-core@1.56.0，或在装有它的目录下运行本命令')}}

const server=await serveFiles(root);
const url=`http://127.0.0.1:${server.address().port}/`+path.relative(root,page).split(path.sep).map(encodeURIComponent).join('/');

function motionReport(file,minSec=2,maxCount=3){
 const r=spawnSync('ffmpeg',['-hide_banner','-i',file,'-vf',`freezedetect=n=-60dB:d=${minSec}`,'-an','-f','null','-'],{encoding:'utf8',maxBuffer:64*1024*1024});
 if(r.status!==0)throw new Error(r.stderr.slice(-2000));
 const s=[...r.stderr.matchAll(/freeze_start: ([\d.]+)/g)].map(m=>+m[1]),d=[...r.stderr.matchAll(/freeze_duration: ([\d.]+)/g)].map(m=>+m[1]);
 const totalDuration=Number(spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'}).stdout);
 const segments=s.map((x,i)=>({start:+x.toFixed(2),duration:+(d[i]??(totalDuration-x)).toFixed(2)})).filter(x=>Number.isFinite(x.duration));
 return{rule:`静止>${minSec}s 不超过${maxCount}处`,count:segments.length,totalSeconds:+segments.reduce((a,x)=>a+x.duration,0).toFixed(1),passed:segments.length<=maxCount,segments,note:'只证明画面有变化，不证明动作在讲解；呼吸层与细线描画不能用来解决静止段'};
}

// ---------- 自动画面检查 ----------
// 在页面里逐帧读取 SVG 元素的实际位置（含变换），只看「可见」元素：
//  - 遮挡：文字被绘制在它之后的不透明实心图形（有效不透明度 ≥0.35，例如灰条、卡片、角色）盖住 ≥25%
//  - 文字重叠：两段可见文字相交 ≥15%（按较小者）
//  - 字号：清晰可见的文字 <22px；说明文字用了浅灰 muted（警告）
//  - 越界：文字进入右上角（x>1440 且 y<180）、伸出画面左右边；非字幕元素进入字幕区（y>955）
//  - 空白：开场 1 秒后主区域没有内容；主体高度长期不足主区域一半（警告）
//  - 角色：页面用了角色但 1 秒后有较多帧不在场（警告）
//  - 细线压字：描边路径（箭头、连线、边框）的已描出部分穿过文字字形区（错误；有意的删除线标 lint:'strike'）
//  - 指向：箭头终点不在声明的 target 对象上，或 target 不在画面上（错误）；箭头未声明 target（警告）
// data-lint="veil"（压暗层）不算遮挡；同一问题持续 ≥0.5 秒才算（过渡中一闪而过的不算）。
function frameScan(){
 const svg=document.querySelector('.stage svg'),sr=svg.getBoundingClientRect(),k=1920/sr.width;
 const box=e=>{const r=e.getBoundingClientRect();return{x:(r.left-sr.left)*k,y:(r.top-sr.top)*k,w:r.width*k,h:r.height*k}};
 const alpha=e=>{let a=1;for(let n=e;n&&n!==svg;n=n.parentElement){if(n.getAttribute&&n.getAttribute('data-lint')==='veil')return -1;const o=parseFloat(n.getAttribute&&n.getAttribute('opacity'));if(!isNaN(o))a*=o;const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return 0}const fo=parseFloat(e.getAttribute('fill-opacity'));if(!isNaN(fo))a*=fo;return a};
 const inChar=e=>!!e.closest('[data-lint="character"]');
 const items=[];let i=0;
 for(const e of svg.querySelectorAll('text,rect,path,ellipse,circle,polygon')){
  i++;const a=alpha(e);if(a<=0)continue;const b=box(e);if(b.w<=0||b.h<=0)continue;
  if(e.tagName==='text'){const s=e.textContent.trim();if(!s)continue;const cs=getComputedStyle(e);items.push({i,e,kind:'text',s,a,b,size:parseFloat(cs.fontSize),fill:(e.getAttribute('fill')||'').toLowerCase(),caption:e.classList.contains('caption')});}
  else{const f=(e.getAttribute('fill')||'').toLowerCase();if(!f||f==='none'||f==='transparent')continue;if(b.w>=1900&&b.h>=1000)continue;items.push({i,kind:'shape',tag:e.tagName,a,b,char:inChar(e)});}
 }
 const inter=(p,q)=>Math.max(0,Math.min(p.x+p.w,q.x+q.w)-Math.max(p.x,q.x))*Math.max(0,Math.min(p.y+p.h,q.y+q.h)-Math.max(p.y,q.y));
 const texts=items.filter(x=>x.kind==='text'&&x.a>=.25),shapes=items.filter(x=>x.kind==='shape'&&x.a>=.35);
 const out=[];
 for(const t of texts){
  const area=t.b.w*t.b.h;
  for(const s of shapes)if(s.i>t.i&&inter(t.b,s.b)/area>=.25){out.push({type:'遮挡',level:'error',key:`遮挡|${t.s}`,msg:`文字「${t.s}」被后画的${s.char?'角色':'实心图形'}盖住`});break}
  if(t.a>=.6&&t.size<22)out.push({type:'字号',level:'error',key:`字号|${t.s}`,msg:`「${t.s}」只有 ${t.size}px（至少 22px）`});
  if(t.a>=.6&&t.size<30&&/9aa093|rgb\(154, ?160, ?147\)/.test(t.fill))out.push({type:'颜色',level:'warn',key:`颜色|${t.s}`,msg:`说明文字「${t.s}」用了浅灰 muted，应改用 sub`});
  if(!t.caption&&t.b.x+t.b.w>1440&&t.b.y<180)out.push({type:'越界',level:'error',key:`右上|${t.s}`,msg:`「${t.s}」进入右上角`});
  if(t.b.x<-2||t.b.x+t.b.w>1922)out.push({type:'越界',level:'error',key:`边缘|${t.s}`,msg:`「${t.s}」伸出画面左右边`});
 }
 for(let p=0;p<texts.length;p++)for(let q=p+1;q<texts.length;q++){const A=texts[p],B=texts[q],m=Math.min(A.b.w*A.b.h,B.b.w*B.b.h);if(m>0&&inter(A.b,B.b)/m>=.15)out.push({type:'文字重叠',level:'error',key:`重叠|${A.s}|${B.s}`,msg:`「${A.s}」与「${B.s}」重叠`})}
 // 细线压字：沿每条可见描边路径取点（只取已描出的部分），落进文字字形区就报错。
 // 删除线等有意压字的线用 path(...,{lint:'strike'}) 标出并在自审里说明。
 const toStage=(e,p)=>{const m=e.getScreenCTM();const q=new DOMPoint(p.x,p.y).matrixTransform(m);return{x:(q.x-sr.left)*k,y:(q.y-sr.top)*k}};
 const glyph=t=>({x:t.b.x+2,y:t.b.y+t.b.h*.12,w:t.b.w-4,h:t.b.h*.76});   // 文字框上下各收 12%，接近字形实际高度
 const inBox=(p,b,m=0)=>p.x>=b.x-m&&p.x<=b.x+b.w+m&&p.y>=b.y-m&&p.y<=b.y+b.h+m;
 const strokes=[];
 for(const e of svg.querySelectorAll('path,line,polyline')){
  const st=(e.getAttribute('stroke')||'').toLowerCase(),sw=parseFloat(e.getAttribute('stroke-width')||'0');
  if(!st||st==='none'||sw<1.5)continue;const a=alpha(e);if(a<.35||inChar(e))continue;
  let total=0;try{total=e.getTotalLength()}catch{continue}if(!(total>0))continue;
  const vis=e.getAttribute('pathLength')==='1'?1-(parseFloat(e.getAttribute('stroke-dashoffset'))||0):1;if(vis<=0)continue;
  const n=Math.min(300,Math.max(8,Math.ceil(total*vis/6))),pts=[];
  for(let j=0;j<=n;j++)pts.push(toStage(e,e.getPointAtLength(total*vis*j/n)));
  strokes.push({e,pts,vis,lint:e.getAttribute('data-lint')||'',target:e.getAttribute('data-target')||''});
 }
 // 被后画的不透明填充图形盖住的线段看不见，不算压字（例如纸片压在托盘边框上）。
 const order=new Map([...svg.querySelectorAll('*')].map((e,j)=>[e,j]));
 const fills=[];for(const e of svg.querySelectorAll('rect,path,ellipse,circle,polygon')){const f=(e.getAttribute('fill')||'').toLowerCase();if(!f||f==='none'||f==='transparent'||alpha(e)<.9)continue;const b=box(e);if(b.w>=1900&&b.h>=1000)continue;fills.push({j:order.get(e),b})}
 const hidden=(p,from,to)=>fills.some(f=>f.j>from&&f.j<to&&inBox(p,f.b,-1));
 for(const s of strokes){
  if(s.lint==='strike')continue;const sj=order.get(s.e);
  for(const t of texts){if(t.a<.6)continue;const g=glyph(t),tj=order.get(t.e);if(s.pts.some(p=>inBox(p,g)&&!(tj>sj&&hidden(p,sj,tj)))){out.push({type:'细线压字',level:'error',key:`细线|${t.s}`,msg:`线条或箭头穿过文字「${t.s}」`});}}
 }
 // 指向：箭头/指向线描完后，终点必须落在声明的对象上（文字内容包含 target，或 data-name 等于 target）；描线途中不判断
 for(const s of strokes.filter(x=>x.lint==='pointer'&&x.vis>=.98)){
  const end=s.pts.at(-1);
  if(!s.target){out.push({type:'指向',level:'warn',key:`指向|未声明|${Math.round(end.x/40)}`,msg:`箭头终点(${Math.round(end.x)},${Math.round(end.y)})没有声明指向对象（arrow 的 target）`});continue}
  const named=[...svg.querySelectorAll('[data-name]')].filter(e=>e.getAttribute('data-name')===s.target&&alpha(e)>=.35).map(box);
  const cands=[...named,...texts.filter(t=>t.s.includes(s.target)).map(t=>t.b)];
  if(!cands.length)out.push({type:'指向',level:'error',key:`指向|缺|${s.target}`,msg:`箭头指向的「${s.target}」此时不在画面上`});
  else if(!cands.some(b=>inBox(end,b,40)))out.push({type:'指向',level:'error',key:`指向|偏|${s.target}`,msg:`箭头终点(${Math.round(end.x)},${Math.round(end.y)})没有落在「${s.target}」上`});
 }
 for(const x of [...texts,...shapes])if(!(x.kind==='text'&&x.caption)&&x.b.y+x.b.h>957&&x.b.y<1080&&x.b.h<900)out.push({type:'越界',level:'error',key:`字幕区|${x.kind==='text'?x.s:x.tag+Math.round(x.b.x)}`,msg:`${x.kind==='text'?'「'+x.s+'」':'图形'}进入字幕区（y>955）`});
 const main=[...texts.filter(t=>!t.caption&&t.b.y>185),...shapes.filter(s=>s.b.y>185&&s.b.y<955)];
 const top=Math.min(...main.map(m=>m.b.y)),bot=Math.max(...main.map(m=>m.b.y+m.b.h));
 return{issues:out,mainCount:main.length,height:main.length?Math.min(bot,955)-Math.max(top,185):0,character:shapes.some(s=>s.char)};
}
async function runLint(pg,dur,every){
 const frames=[];for(let t=0;t<=dur+1e-6;t+=every){await pg.evaluate(x=>window.renderAt(x),+t.toFixed(3));frames.push({t:+t.toFixed(2),...await pg.evaluate(frameScan)})}
 // 持续性：同一 key 在连续帧中出现，跨度 ≥0.5 秒才报告
 const need=Math.max(2,Math.ceil(.5/every)+1),runs=new Map(),found=[];
 frames.forEach((f,idx)=>{const keys=new Set(f.issues.map(x=>x.key));for(const x of f.issues){const r=runs.get(x.key);if(r&&r.last===idx-1){r.last=idx;r.n++}else runs.set(x.key,{...x,first:idx,last:idx,n:1})}for(const[k,r]of runs)if(!keys.has(k)&&r.last<idx){if(r.n>=need)found.push(r);runs.delete(k)}});
 for(const r of runs.values())if(r.n>=need)found.push(r);
 const issues=found.map(r=>({type:r.type,level:r.level,msg:r.msg,from:frames[r.first].t,to:frames[r.last].t}));
 const late=frames.filter(f=>f.t>=1);
 const empty=late.filter(f=>f.mainCount===0);if(empty.length)issues.push({type:'空白',level:'error',msg:`开场 1 秒后仍有 ${empty.length} 帧主区域没有内容`,from:empty[0].t,to:empty.at(-1).t});
 const thin=late.filter(f=>f.height<380);if(late.length&&thin.length/late.length>.3)issues.push({type:'饱满度',level:'warn',msg:`${Math.round(thin.length/late.length*100)}% 的帧主体高度不足主区域一半（380px）`});
 if(frames.some(f=>f.character)){const miss=late.filter(f=>!f.character);if(late.length&&miss.length/late.length>.2)issues.push({type:'角色',level:'warn',msg:`角色在 ${Math.round(miss.length/late.length*100)}% 的帧里不在场`,from:miss[0].t,to:miss.at(-1).t})}
 issues.sort((a,b)=>(a.level==='error'?0:1)-(b.level==='error'?0:1)||(a.from??0)-(b.from??0));
 const errors=issues.filter(x=>x.level==='error').length,warnings=issues.length-errors;
 return{every,frames:frames.length,errors,warnings,passed:errors===0,issues,note:'自动检查只覆盖可量化的问题；隐喻、因果、时序仍需看帧自审'};
}
function printLint(r){console.log(`自动画面检查：${r.frames} 帧，错误 ${r.errors}，警告 ${r.warnings}`);for(const x of r.issues.slice(0,30))console.log(`  [${x.level==='error'?'错误':'警告'}] ${x.type}${x.from!==undefined?` ${x.from}～${x.to}s`:''}：${x.msg}`);if(r.issues.length>30)console.log(`  ……另有 ${r.issues.length-30} 条，见报告`)}

let browser,encoder;
try{
 browser=await chromium.launch({channel:opt('--browser',process.platform==='win32'?'msedge':'chrome'),headless:true});
 const pg=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];pg.on('pageerror',e=>errors.push(e.message));
 const loaded=new Set([page]);
 pg.on('response',r=>{try{const u=new URL(r.url());if(u.origin!==new URL(url).origin)return;const f=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(f.startsWith(root+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile())loaded.add(f);}catch{}});
 await pg.goto(url);await pg.waitForFunction(()=>!!window.videoReady);await pg.evaluate(()=>window.videoReady);
 if(errors.length)throw new Error('页面脚本错误：'+errors.join('; '));
 await pg.addStyleTag({content:'header,.transport,.status{display:none!important}main{padding:0!important;max-width:none!important}.stage{border-radius:0;box-shadow:none}'});
 const stage=pg.locator('.stage'),dur=await pg.evaluate(()=>window.videoDuration);
 if(!Number.isFinite(dur)||dur<=0)throw Error('页面时长必须为正数');
 if(rest.includes('--full')&&!rest.includes('--allow-short-demo')&&dur<180)throw Error('正式整片至少180秒');
 if(mode==='stills'){
  const dir=path.join(pageDir,'output','stills');fs.mkdirSync(dir,{recursive:true});
  const every=Number(opt('--every',opt('--times')?0:2));
  if(!Number.isFinite(every)||every<0||(rest.includes('--every')&&every===0))throw Error('--every必须为正数');
  const requested=opt('--times')?opt('--times').split(',').map(Number):[];
  if(requested.some(t=>!Number.isFinite(t)||t<0||t>dur))throw Error('关键帧时间须位于音轨范围内');
  const times=[...new Set([...requested,...(every?Array.from({length:Math.floor(dur/every)+1},(_,i)=>i*every):[])].map(t=>+t.toFixed(3)))].sort((a,b)=>a-b);
  const files=[];
  for(const t of times){await pg.evaluate(x=>window.renderAt(x),t);const f=path.join(dir,`still-${t.toFixed(3)}.png`);await stage.screenshot({path:f});files.push(f)}
  // 分页，避免长片的FFmpeg命令超过Windows命令行长度。
  const pages=[];
  for(let offset=0;offset<files.length;offset+=24){
   const group=files.slice(offset,offset+24),cols=3,rows=Math.ceil(group.length/cols);
   const inputs=group.flatMap(f=>['-i',f]);
   const pad=Array.from({length:rows*cols-group.length},()=>['-f','lavfi','-i','color=c=0xfbf8f1:s=1920x1080']).flat();
   const n=rows*cols,layout=Array.from({length:n},(_,i)=>`${i%cols*640}_${Math.floor(i/cols)*360}`).join('|');
   const name=offset===0?'contact.png':`contact-${String(pages.length+1).padStart(3,'0')}.png`,sheet=path.join(dir,name);
   const filter=`${Array.from({length:n},(_,i)=>`[${i}]scale=640:360[s${i}]`).join(';')};${Array.from({length:n},(_,i)=>`[s${i}]`).join('')}xstack=inputs=${n}:layout=${layout}`;
   const r=spawnSync('ffmpeg',['-v','error','-y',...inputs,...pad,'-filter_complex',filter,'-frames:v','1',sheet],{encoding:'utf8'});
   if(r.status!==0)throw new Error(r.stderr);
   pages.push({file:name,times:times.slice(offset,offset+24)});
  }
  fs.writeFileSync(path.join(dir,'contact.json'),JSON.stringify({times,cols:3,pages,note:'依页序从左到右、从上到下；所有页均需查看'},null,2));
  fs.writeFileSync(path.join(dir,'contact.inputs.json'),JSON.stringify({root,files:[...loaded].sort().map(f=>({path:path.relative(root,f),sha256:createHash('sha256').update(fs.readFileSync(f)).digest('hex')}))},null,2));
  console.log(JSON.stringify({pages:pages.map(p=>path.join(dir,p.file)),frames:files.length}));
 }else if(mode==='lint'){
  const r=await runLint(pg,dur,Number(opt('--every',.25)));
  const rep=path.resolve(opt('--report',path.join(pageDir,'output','画面检查.json')));fs.mkdirSync(path.dirname(rep),{recursive:true});
  fs.writeFileSync(rep,JSON.stringify(r,null,2));printLint(r);console.log(rep);
  if(!r.passed)process.exitCode=4;
 }else{
  // 导出前自动画面检查：有错误就不导出
  const lint=await runLint(pg,dur,.25);printLint(lint);
  fs.mkdirSync(path.join(pageDir,'output'),{recursive:true});fs.writeFileSync(path.join(pageDir,'output','画面检查.json'),JSON.stringify(lint,null,2));
  if(!lint.passed){console.error('自动画面检查有错误：先修改页面、重新生成关键帧并更新自审，再导出');process.exitCode=4;throw Object.assign(new Error('lint'),{quiet:true})}
  const name=opt('--output');if(!name||path.basename(name)!==name)throw new Error('请用 --output 指定不含目录的新文件名');
  const file=path.join(pageDir,'output',name);if(fs.existsSync(file))throw new Error('输出已存在，换一个文件名，保留旧版本');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const audio=path.resolve(pageDir,await pg.evaluate(()=>window.videoAudio));
  const fps=30,frames=Math.ceil(dur*fps);
  const clip=await stage.boundingBox();
  if(!clip||clip.width!==1920||clip.height!==1080)throw Error('导出舞台须为1920×1080');
  encoder=spawn('ffmpeg',['-v','error','-n','-f','image2pipe','-framerate',String(fps),'-vcodec','png','-i','pipe:0','-i',audio,'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',file],{stdio:['pipe','inherit','inherit']});
  const done=once(encoder,'exit');
  // renderAt is deterministic and paused; a fixed stage clip avoids locator
  // stability waits on every frame. Equivalent PNGs are checked in runtime QA.
  for(let i=0;i<frames;i++){await pg.evaluate(x=>window.renderAt(x),i/fps);const png=await pg.screenshot({type:'png',clip});if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');if(i%150===0)console.log(`渲染 ${i}/${frames}`)}
  encoder.stdin.end();const[code]=await done;if(code!==0)throw new Error('FFmpeg '+code);
  const dec=spawnSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{encoding:'utf8'});if(dec.status!==0)throw new Error(dec.stderr);
  const probed=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height,r_frame_rate,duration','-of','json',file],{encoding:'utf8'});
  if(probed.status!==0)throw Error('ffprobe失败：'+probed.stderr);
  const probe=JSON.parse(probed.stdout),spec=validateMedia(probe,dur,fps);
  const motion=motionReport(file);
  fs.writeFileSync(file+'.check.json',JSON.stringify({file,fps,frames,decode:'passed',...spec,probe,motion,mode:rest.includes('--full')?(rest.includes('--allow-short-demo')?'demo':'full'):'sample',humanAcceptance:'待用户看片'},null,2));
  console.log(file);console.log(JSON.stringify({motion:{count:motion.count,totalSeconds:motion.totalSeconds,passed:motion.passed}}));
  if(!motion.passed&&rest.includes('--full'))process.exitCode=2;
  if(!motion.passed)console.warn(`静止段 ${motion.count} 处，超过「${motion.rule}」：回到动作分镜补有含义的动作，再导出新版本`);
 }
}catch(e){if(!e.quiet)throw e}finally{if(encoder?.exitCode===null)encoder.kill();await browser?.close();server.close()}
