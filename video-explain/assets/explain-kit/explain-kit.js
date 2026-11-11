// explain-kit：手绘讲解动画组件库（1920×1080 SVG，字符串拼接，纯函数）
// 来源：已定稿样片「窗口装满，较早的约束被截掉」（assets/examples/window-overflow/）。
// 约定：所有函数只依赖传入的参数和时间 t；不用随机数、不读系统时间；任意跳转可复现。
// 手绘抖动由种子决定、不随时间变化——不要做整体抖动（boil）。
// 用法与组件清单见 references/animation-kit.md。

// ---------- 配色 ----------
// 橙 = 动作/问题，蓝 = 返回/保留/正常，墨 = 正文，sub = 说明文字（比 muted 深，保证可读）
export const C={ink:'#34392f',blue:'#5f87a5',blueD:'#3f6a8a',blueF:'#e3eef5',orange:'#cd8048',orangeD:'#b0652c',orangeF:'#fdebd6',sub:'#6f7568',muted:'#9aa093',paper:'#fffdf8',tape:'#f4efe2',bg:'#fbf8f1'};

// ---------- 时间与缓动 ----------
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
/** 进度：t 在 [a, a+d] 内从 0 到 1 */
export const P=(t,a,d)=>d<=0?(t>=a?1:0):clamp((t-a)/d);
export const sm=p=>p*p*(3-2*p);                                    // 平滑
export const eOut=p=>1-(1-p)**3;                                    // 减速停靠
export const eIO=p=>p<.5?4*p**3:1-(-2*p+2)**3/2;                    // 位移：先加速后减速
export const eBack=p=>{const c=1.70158;return p<=0?0:1+(c+1)*(p-1)**3+c*(p-1)**2}; // 回弹出现
/** 一次性鼓起 0→1→0，用于洗色、闪一下 */
export const pulse=(t,a,d)=>Math.sin(Math.PI*P(t,a,d));
/** 在 a 出现、在 b 淡出 */
export const span=(t,a,b,fi=.4,fo=.4)=>sm(P(t,a,fi))*(1-sm(P(t,b,fo)));
export const lerp=(a,b,p)=>a+(b-a)*p;
export const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
export const jit=(s,k)=>{const v=Math.sin(s*12.9898+k*78.233)*43758.5453;return(v-Math.floor(v))*2-1};
export const sd=id=>[...id].reduce((a,c)=>a+c.charCodeAt(0),0);

// ---------- 手绘图元 ----------
/** 手绘矩形路径（种子 s 决定抖动） */
export function rr(x,y,w,h,s){const j=k=>jit(s,k)*1.8;return`M${x+j(1)} ${y+j(2)}Q${x+w/2} ${y+j(3)*2.2} ${x+w+j(4)} ${y+j(5)}Q${x+w+j(6)*2.2} ${y+h/2} ${x+w+j(7)} ${y+h+j(8)}Q${x+w/2} ${y+h+j(9)*2.2} ${x+j(10)} ${y+h+j(11)}Q${x+j(12)*2.2} ${y+h/2} ${x+j(1)} ${y+j(2)}Z`}
/** 路径；draw<1 时按比例描画（边画边出现） */
// lint：'pointer' 表示箭头/指向线（须配 target）；'strike' 表示有意压字的删除线。
// target：指向对象的名字，须与画面上某段文字包含的内容或某个 name 一致；name：给对象起名，供 target 引用。
const lintAttr=(lint,target,name)=>(lint?` data-lint="${lint}"`:'')+(target?` data-target="${esc(target)}"`:'')+(name?` data-name="${esc(name)}"`:'');
export const path=(d,{stroke=C.ink,w=3,fill='none',draw=1,dash='',a=1,lint='',target='',name=''}={})=>a<=0||draw<=0?'':`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="${a}" ${draw<1?`pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1-draw}"`:dash?`stroke-dasharray="${dash}"`:''}${lintAttr(lint,target,name)}/>`;
export const text=(x,y,s,{size=26,fill=C.ink,a=1,anchor='start',weight=400}={})=>a<=0?'':`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" opacity="${a}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;
/** 手绘圈的路径：path(ellipse(...),{draw}) 描画圈出 */
export const ellipse=(cx,cy,rx,ry,s)=>{let d='';for(let i=0;i<=40;i++){const a=-2.2+i/40*Math.PI*2.15,r=1+jit(s,i%7)*.03;d+=(i?'L':'M')+(cx+Math.cos(a)*rx*r).toFixed(1)+' '+(cy+Math.sin(a)*ry*r).toFixed(1)}return d};
export const rect=(x,y,w,h,fill,a,rx=6)=>a<=0?'':`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" opacity="${a}"/>`;
/** 带底板的强调文字（压在复杂背景上也能读） */
export const plateText=(x,y,s,{size=30,fill=C.orangeD,a=1,anchor='start'}={})=>{if(a<=0)return'';const w=[...s].length*size+24,x0=anchor==='middle'?x-w/2:x-12;return rect(x0,y-size-8,w,size+22,C.paper,.95*a)+text(x,y,s,{size,fill,a,anchor,weight:700})};

// ---------- 纸片（消息、文件、日志、结果） ----------
export const SHEET={rule:[C.blueF,C.blue],chat:[C.paper,C.ink],code:[C.paper,C.ink],log:[C.orangeF,C.orange],tool:[C.blueF,C.blue],res:[C.bg,C.muted]};
/**
 * b = {id, st, top, body}；st: rule 关键要求 | chat 对话 | code 源码 | log 日志 | tool 工具结果 | res 预留空白
 * wash 洗色 0~1（大面积强调，washC 选墨/蓝/橙）；code 代码行写出进度；prog 进度条；outline 外圈橙框
 * 宽度小于 90 时自动画成「窄条」：只有边框和几道示意线、不写字（用于表示很多条内容，例如几十轮对话）。
 * 需要读字的纸片宽度至少 100；正文两行、每行不超过 4 个字。
 */
export function sheet(b,x,y,w,h,{a=1,top=b.top,body=b.body||[],wash=0,washC=C.orange,prog=-1,code=1,outline=0,st=b.st}={}){
 if(a<=0)return'';const[f,k]=SHEET[st],s=sd(b.id);let g='';
 if(w<90){g+=path(rr(x,y,w,h,s),{fill:f,stroke:k,w:2.4,dash:st==='res'?'7 6':''});for(let i=0;i<4;i++)g+=path(`M${x+w*.22} ${y+30+i*Math.max(14,h/6)}H${x+w*(.78-(i%2)*.2)}`,{stroke:st==='log'?'#e2ad80':'#cfd2c5',w:4});if(wash>0)g+=rect(x+2,y+2,w-4,h-4,washC,(washC===C.ink?.12:washC===C.blue?.2:.26)*wash);if(outline>0)g+=path(rr(x-5,y-5,w+10,h+10,s+5),{stroke:C.orange,w:3,a:outline});return`<g opacity="${a}">${g}</g>`}
 g+=path(rr(x,y,w,h,s),{fill:f,stroke:k,w:st==='rule'?3.4:2.6,dash:st==='res'?'9 8':''});
 g+=text(x+16,y+36,top,{size:st==='rule'||st==='chat'?24:26,fill:st==='rule'?C.blueD:C.sub});
 if(st==='rule')body.forEach((l,i)=>g+=text(x+16,y+92+i*42,l,{size:34,weight:700,fill:C.ink}));
 else if(st==='chat'||st==='tool'||st==='res')body.forEach((l,i)=>g+=text(x+16,y+(st==='chat'?92:72)+i*36,l,{size:28,fill:st==='res'?C.sub:C.ink}));
 if(st==='chat')for(let i=0;i<2;i++)g+=path(`M${x+16} ${y+150+i*16}H${x+w-[30,50][i]}`,{stroke:'#d6d9cd',w:5});
 if(st==='code')for(let i=0;i<7;i++){const q=clamp(code*7-i);if(q>0)g+=path(`M${x+16+(i%3)*18} ${y+64+i*18}H${x+16+(i%3)*18+[170,120,190,90,150,110,170][i]*q}`,{stroke:'#c3c7b8',w:6})}
 if(st==='log')for(let i=0;i<5;i++)if(y+64+i*18<y+h-14)g+=path(`M${x+16} ${y+64+i*18}H${x+16+[130,100,140,80,120][i]}`,{stroke:'#e2ad80',w:6});
 if(prog>=0)g+=rect(x+16,y+h-26,w-32,10,'#e3e0d5',1,5)+rect(x+16,y+h-26,(w-32)*clamp(prog),10,C.blue,1,5);
 if(wash>0)g+=rect(x+3,y+3,w-6,h-6,washC,(washC===C.ink?.12:washC===C.blue?.2:.26)*wash);
 if(outline>0)g+=path(rr(x-7,y-7,w+14,h+14,s+5),{stroke:C.orange,w:3.5,a:outline});
 return`<g opacity="${a}">${g}</g>`;
}

// ---------- 纸卷：按时间排列的内容 ----------
/** 横贯画面的纸带（聊天记录、日志流、时间线） */
export const tape=(y,h,a)=>rect(0,y,1920,h,C.tape,a,0)+path(`M0 ${y}Q960 ${y-3} 1920 ${y+1}`,{stroke:'#d9d2bf',w:2.5,a})+path(`M0 ${y+h}Q960 ${y+h+3} 1920 ${y+h-1}`,{stroke:'#d9d2bf',w:2.5,a});
/**
 * 纸卷布局：items 按先后从左到右排，{id, w, in, chip?}；出现时宽度平滑增长，后面的内容随之右移。
 * shift(t) 返回整体左移量（截断、滚动）。返回 layout(t) → {pos:{id:x}, start, end}
 */
export function tapeLayout({x0,gap=14,items,shift=()=>0}){
 const presence=(b,t)=>b.chip?sm(P(t,b.in,.6)):eOut(P(t,b.in,.45));
 return t=>{const s=shift(t);let x=x0-s;const pos={};for(const b of items){pos[b.id]=x;x+=(b.w+gap)*presence(b,t)}return{pos,end:x-gap,start:x0-s}};
}
/** 落下出现：返回 dy（带回弹） */
export const dropDy=(t,at,dist=80)=>-dist*(1-eBack(P(t,at,.5)));
/** 先往反方向收一下再移动：返回位移量 */
export const pushWithAnticipation=(t,at,dist,{pre=.25,back=10,dur=1.1}={})=>{const p=sm(P(t,at,pre)),mv=eIO(P(t,at+pre,dur));return -back*p*(1-mv)+dist*mv};

// ---------- 取景框（上下文窗口、视野、范围） ----------
/** 框外压暗：表示「看不到/不在范围内」 */
// data-lint="veil"：自动画面检查把它当作有意的压暗层，不算遮挡
export const veil=(F,a,{top=10}={})=>a<=0?'':`<g data-lint="veil">${rect(0,F.y-top,F.x,F.h+top*2,C.bg,.55*a,0)+rect(F.x+F.w,F.y-top,1920-F.x-F.w,F.h+top*2,C.bg,.55*a,0)}</g>`;
/** 取景框：手绘边框 + 四角粗角标；draw 控制开场描画 */
export function viewport(F,draw){let g=path(rr(F.x,F.y,F.w,F.h,11),{w:4.2,draw});for(const[cx,cy,dx,dy]of[[F.x,F.y,1,1],[F.x+F.w,F.y,-1,1],[F.x,F.y+F.h,1,-1],[F.x+F.w,F.y+F.h,-1,-1]])g+=path(`M${cx} ${cy+dy*40}V${cy}H${cx+dx*40}`,{w:7,a:draw});return g}
/** 框的一条边闪一下（截断、边界） */
export const edgeFlash=(x,y1,y2,e)=>e>0?path(`M${x} ${y1}V${y2}`,{stroke:C.orange,w:8,a:e}):'';
/** 钉住的便签（不随纸卷移动的固定内容） */
// 宽度不足以放下文字时自动加宽，避免文字压到边框
export const pinNote=(x,y,w0,label,{a=1,wash=0}={})=>{const w=Math.max(w0,[...label].length*24+56);return a<=0?'':`<g opacity="${a}">${path(rr(x,y,w,42,77),{fill:C.paper,stroke:C.ink,w:2.4})}${rect(x+3,y+3,w-6,36,C.orange,.26*wash)}<circle cx="${x+20}" cy="${y+21}" r="7" fill="${C.orange}"/>${text(x+38,y+30,label,{size:24})}</g>`};
/** 溢出虚线框 */
export const overflowBox=(x,y,w,h,a)=>path(rr(x,y,w,h,7),{stroke:C.orange,w:3.2,dash:'12 8',a});
/** 容量条：used>1 时变橙并画出超出部分 */
export function capacityBar(x,y,w,used,a,{right='框宽 = 容量上限',maxX=1900}={}){
 const hot=used>1.001;
 return rect(x,y,w,12,'#e6e3d9',a,6)+rect(x,y,w*clamp(used),12,hot?C.orange:C.blue,a,6)+(hot?rect(x+w,y,Math.min(w*(used-1),maxX-x-w),12,C.orange,a*.5,6):'')
  +text(x,y+42,`已用 ${Math.round(used*100)}%`,{size:28,fill:hot?C.orangeD:C.sub,weight:hot?700:400,a})+text(x+w,y+42,right,{size:24,fill:C.sub,anchor:'end',a});
}

// ---------- 标注 ----------
/** 量出长度：从 x1 描到 x2，描完显示标签 */
export function measure(x1,x2,y,ln,a,label){
 if(ln<=0||a<=0)return'';const xe=lerp(x1,x2,ln);
 return path(`M${x1} ${y}H${xe}`,{stroke:C.orange,w:3.5,a})+path(`M${x1} ${y-10}V${y+10}`,{stroke:C.orange,w:3.5,a})+(ln>=1?path(`M${x2} ${y-10}V${y+10}`,{stroke:C.orange,w:3.5,a})+text(x2+14,y+9,label,{size:24,fill:C.orangeD,a}):'');
}
/** 括号：标出一段范围（蓝 = 保留） */
export const bracket=(x1,x2,y,k,label,{color=C.blue,labelColor=C.blueD}={})=>k<=0?'':path(`M${x1} ${y+10}V${y}H${lerp(x1,x2,k)}`+(k>=1?`V${y+10}`:''),{stroke:color,w:3.5})+text(x1+10,y-12,label,{size:26,fill:labelColor,a:k});
/** 扫描带：一段淡色带从 from 扫到 to（表示「逐段检查」），p 为 0~1 */
export const scanBand=(p,from,to,y,h,{w=170}={})=>p>0&&p<1?rect(lerp(from,to,eIO(p)),y,w,h,C.ink,.14,10):'';
/** 印章：倾斜的强调框，q 为出现进度（eBack） */
export const stamp=(x,y,label,q,a,{w=168})=>q>0&&a>0?`<g opacity="${a}" transform="translate(${x} ${y}) rotate(-6) scale(${q})">${path(rr(-w/2,-30,w,58,8),{stroke:C.orange,w:3.5,fill:C.paper})}${text(0,12,label,{size:30,fill:C.orangeD,anchor:'middle',weight:700})}</g>`:'';
/** 标签：回弹出现的说明框，y 为文字基线 */
export const tag=(x,y,w,label,q,{color=C.ink,a=1}={})=>q<=0||a<=0?'':`<g opacity="${clamp(q)*a}" transform="translate(${x} ${y}) scale(${q}) translate(${-x} ${-y})">${path(rr(x,y-34,w,50,x),{stroke:color,w:2.6,fill:C.paper})}${text(x+16,y,label,{size:26,fill:color===C.muted?C.sub:C.ink})}</g>`;
/** 描画圈出，until 后淡出 */
export const circleOut=(t,at,cx,cy,rx,ry,{until=Infinity,seed=4,dur=.6,w=3}={})=>{const d=sm(P(t,at,dur)),a=1-sm(P(t,until,.5));return d>0&&a>0?path(ellipse(cx,cy,rx,ry,seed),{stroke:C.orange,w,draw:d,a}):''};

// ---------- 指向、对错、清单 ----------
/** 箭头：draw 0~1 描出，描到最后出现箭头头部；target 写指向对象的名字（文字内容或 name），自动检查会核对终点是否落在它上面 */
export function arrow(x1,y1,x2,y2,draw=1,{color=C.blue,w=3.5,a=1,target=''}={}){
 if(draw<=0||a<=0)return'';const ang=Math.atan2(y2-y1,x2-x1),h=18,ex=lerp(x1,x2,draw),ey=lerp(y1,y2,draw);
 // 描完（箭头头部出现）才标为指向线，描线途中的终点不参与指向检查
 return path(`M${x1} ${y1}L${ex} ${ey}`,{stroke:color,w,a,...(draw>=.98?{lint:'pointer',target}:{})})+(draw>=.9?path(`M${x2-h*Math.cos(ang-.5)} ${y2-h*Math.sin(ang-.5)}L${x2} ${y2}L${x2-h*Math.cos(ang+.5)} ${y2-h*Math.sin(ang+.5)}`,{stroke:color,w,a:a*P(draw,.9,.1)}):'');
}
/** 打勾：p 0~1 两笔描出 */
export const checkMark=(x,y,s,p,{color=C.blue,w=4}={})=>p<=0?'':path(`M${x} ${y}L${x+s*.38} ${y+s*.4}`,{stroke:color,w,draw:clamp(p*2.2)})+path(`M${x+s*.38} ${y+s*.4}L${x+s} ${y-s*.5}`,{stroke:color,w,draw:clamp(p*2.2-1.2)});
/** 打叉：p 0~1 两笔先后描出 */
export const crossMark=(x,y,s,p,{color=C.orange,w=4.5}={})=>p<=0?'':path(`M${x-s/2} ${y-s/2}L${x+s/2} ${y+s/2}`,{stroke:color,w,draw:clamp(p*2)})+path(`M${x+s/2} ${y-s/2}L${x-s/2} ${y+s/2}`,{stroke:color,w,draw:clamp(p*2-1)});
/** 清单项：回弹出现的标签，check 0~1 打勾（勾在框内右侧，不压文字）；字号 26 */
export function checkTag(x,y,w,label,q,check,{a=1,color=C.blue}={}){
 if(q<=0||a<=0)return'';const h=50;
 return`<g opacity="${clamp(q)*a}" transform="translate(${x} ${y}) scale(${q}) translate(${-x} ${-y})">${path(rr(x,y,w,h,Math.round(x+y)),{stroke:color,w:2.6,fill:C.blueF})}${text(x+16,y+34,label,{size:26})}${checkMark(x+w-44,y+26,28,check,{color})}</g>`;
}
/**
 * 空位：表示「这里本该有、但这次没有」。放在容器内部（例如摘要卡里缺的那一行），
 * 不要把缺失的东西本身画进容器——那会被读成「它还在里面」。label 写缺的是什么。
 */
export const emptySlot=(x,y,w,h,label,a,{color=C.orange}={})=>a<=0?'':path(rr(x,y,w,h,Math.round(x*3+y)),{stroke:color,w:2.6,dash:'8 7',a})+text(x+14,y+h/2+9,label,{size:24,fill:C.orangeD,a});
/** 纸篓：丢弃不再需要的内容（q 出现进度） */
export function bin(x,y,q,{a=1,label=''}={}){
 if(q<=0||a<=0)return'';const g=path(`M${x-38} ${y-40}L${x-30} ${y+38}H${x+30}L${x+38} ${y-40}Z`,{fill:C.paper,w:3})+path(`M${x-46} ${y-42}H${x+46}`,{w:4})+[-14,0,14].map(d=>path(`M${x+d} ${y-26}L${x+d*.85} ${y+28}`,{stroke:C.muted,w:2.6})).join('')+(label?text(x,y+74,label,{size:24,fill:C.sub,anchor:'middle'}):'');
 return`<g opacity="${clamp(q)*a}" transform="translate(${x} ${y+40}) scale(${q}) translate(${-x} ${-y-40})">${g}</g>`;
}
/**
 * 压缩：两块压板从 xL、xR 向中心 cx 合拢，p 0~1。返回 {svg, k}，k 为内容的水平缩放比例（1→minK），
 * 用 squeezeX(x, cx, k) 把被压内容的 x 坐标映射到压缩后位置。先 pushWithAnticipation 式地向外退一下更有力。
 */
export function press(xL,xR,cx,y,h,p,{minW=380,a=1}={}){
 const half=(xR-xL)/2,target=minW/2,cur=lerp(half,target,eIO(clamp(p))),k=cur/half;
 const plate=x=>path(rr(x-14,y-10,28,h+20,Math.round(x)),{fill:C.orangeF,stroke:C.orange,w:3,a})+[0,1,2].map(i=>path(`M${x-6+i*6} ${y+6}V${y+h-6}`,{stroke:C.orange,w:2,a:a*.7})).join('');
 return{svg:plate(cx-cur)+plate(cx+cur),k};
}
export const squeezeX=(x,cx,k)=>cx+(x-cx)*k;

// ---------- 小卡片：工具调用 → 结果 ----------
/** 工具卡：pop 出现进度；run 进度条（-1 不显示）；result 是否已返回 */
export const toolChip=(id,x,y,w,h,label,{pop=1,run=-1,result=false}={})=>`<g opacity="${clamp(pop*1.4)}" transform="translate(${x} ${y}) scale(${pop}) translate(${-x} ${-y})">${path(rr(x,y,w,h,sd(id)+2),{fill:result?C.blueF:C.paper,stroke:C.blue,w:2.6})}${text(x+16,y+38,label,{size:26})}${run>=0?rect(x+w-74,y+25,56,10,'#e3e0d5',1,5)+rect(x+w-74,y+25,56*run,10,C.blue,1,5):''}</g>`;
/** 沿弧线跳到目标：mv 0~1，返回插值后的 {x,y,w,h} */
export const hop=(from,to,mv,arc=150)=>({x:lerp(from.x,to.x,mv),y:lerp(from.y,to.y,mv)-arc*Math.sin(Math.PI*mv),w:lerp(from.w,to.w,mv),h:lerp(from.h,to.h,mv)});

// ---------- 角色：小模型 ----------
/**
 * 圆滚滚的卡通角色，小手趴在 (cx, base) 所在的边沿上往下看。
 * lookX：视线目标的 x（身体轻微倾斜、眼睛跟随）；hops：这些时刻轻轻弹一下（有新内容）。
 * 只表现「在读」；不要给它加「发现缺东西」的表情——模型并不知道自己少看了什么。
 */
export function buddy(t,lookX,{cx=960,base=397,hops=[],scale=1.3,label='模型'}={}){
 const blink=(t%4.1)<.12;
 const b=hops.reduce((a,h)=>a+Math.sin(Math.PI*P(t,h,.45))*(1-P(t,h,.45)*.3),0);
 const rot=clamp((lookX-960)/900,-1,1)*7,ex=clamp((lookX-960)/700,-1,1)*9;
 let g='';
 g+=path(`M${cx-80} ${base}C${cx-90} ${base-66} ${cx-52} ${base-116} ${cx} ${base-116}C${cx+52} ${base-116} ${cx+90} ${base-66} ${cx+80} ${base}Z`,{fill:'#e6f0f7',stroke:C.ink,w:3.4});
 g+=path(`M${cx} ${base-114}Q${cx-4} ${base-134} ${cx+10} ${base-148}`,{w:3});
 const sx=cx+12,sy=base-152;let st='';for(let k=0;k<10;k++){const r=k%2?5:12,a=-Math.PI/2+k*Math.PI/5;st+=(k?'L':'M')+(sx+Math.cos(a)*r).toFixed(1)+' '+(sy+Math.sin(a)*r).toFixed(1)}
 g+=path(st+'Z',{fill:'#f3c26b',stroke:C.ink,w:2.2});
 for(const d of[-27,27]){const x=cx+d+ex,y=base-62;
  g+=blink?path(`M${x-11} ${y}Q${x} ${y+7} ${x+11} ${y}`,{w:3.2}):`<ellipse cx="${x}" cy="${y}" rx="11" ry="15" fill="${C.ink}"/><circle cx="${x+4}" cy="${y-6}" r="4.2" fill="#fff"/>`;}
 for(const d of[-50,50])g+=`<ellipse cx="${cx+d+ex*.5}" cy="${base-38}" rx="13" ry="7" fill="#f0ad93" opacity=".75"/>`;
 g+=path(`M${cx-10+ex*.6} ${base-36}Q${cx+ex*.6} ${base-27} ${cx+10+ex*.6} ${base-36}`,{w:3});
 const body=`<g transform="translate(${cx} ${base}) rotate(${rot}) scale(${1+.05*b} ${1-.07*b}) translate(${-cx} ${-base})">${g}</g>`;
 let hands='';for(const d of[-62,62])hands+=`<ellipse cx="${cx+d}" cy="${base+2}" rx="17" ry="11" fill="#e6f0f7" stroke="${C.ink}" stroke-width="3"/>`;
 return `<g data-lint="character" transform="translate(${cx} ${base}) scale(${scale}) translate(${-cx} ${-base})">${body+hands}</g>`+text(cx+140,base-90,label,{size:30,fill:C.sub});
}

// ---------- 页面外框 ----------
/** 页眉、标题、字幕。titles: [[开始时间, 标题], ...]（按时间升序）；cues: [[开始, 结束, 文本], ...] */
export function chrome(t,{header,titles=[],cues=[],subOn=true}){
 let ti=null;for(const x of titles)if(t>=x[0])ti=x;
 const cue=cues.find(([a,b])=>t>=a&&t<b);
 return text(90,74,header,{size:27,fill:'#7c7f73'})+(ti?text(90,165,ti[1],{size:59,weight:700,a:sm(P(t,ti[0],ti[2]??.5))}):'')
  +(subOn&&cue?`<text x="960" y="1010" text-anchor="middle" class="caption" fill="${C.ink}">${esc(cue[2])}</text>`:'');
}

// ---------- 播放器 ----------
/**
 * 绑定页面控件（#play #restart #seek #time #subOn #status）。音频为时钟，失败显示错误。
 * render(T,{subOn}) 返回 SVG 内容字符串（T 从 0 开始的页面时间）；state(T) 返回附加状态。
 * 暴露 window.renderAt / videoDuration / videoReady，供 scripts/scene.mjs 截图与导出。
 */
export function mountPlayer({svg,audio,duration,render,state=()=>({})}){
 const $=id=>document.getElementById(id),aud=new Audio(audio);aud.preload='auto';let T=0,playing=false,subOn=true;
 function draw(x){T=clamp(x,0,duration);svg.innerHTML=`<rect width="1920" height="1080" fill="${C.bg}"/>`+render(T,{subOn});$('seek').value=T;$('time').textContent=`${T.toFixed(1)} / ${duration.toFixed(1)}`;$('play').textContent=playing?'暂停':'播放';return{time:T,...state(T)}}
 async function play(){try{if(T>=duration-.05)T=0;aud.currentTime=T;await aud.play();playing=true;$('status').textContent=''}catch(e){playing=false;$('status').textContent='音频播放失败：'+e.message}draw(T)}
 $('seek').max=duration;
 $('play').onclick=()=>{if(playing){aud.pause();playing=false;draw(T)}else play()};$('restart').onclick=()=>{T=0;play()};
 $('seek').oninput=e=>{T=+e.target.value;aud.currentTime=T;draw(T)};$('subOn').onchange=e=>{subOn=e.target.checked;draw(T)};
 aud.addEventListener('ended',()=>{playing=false;draw(duration)});aud.addEventListener('error',()=>{playing=false;$('status').textContent='音频加载失败'});
 (function tick(){if(playing&&!aud.paused)draw(aud.currentTime);requestAnimationFrame(tick)})();
 window.renderAt=x=>{aud.pause();playing=false;return draw(x)};window.videoDuration=duration;window.videoAudio=audio;
 window.videoState=()=>({time:T,audioTime:aud.currentTime,audioDuration:aud.duration,paused:aud.paused,muted:aud.muted,volume:aud.volume,rate:aud.playbackRate});
 window.videoReady=(async()=>{await document.fonts.load('26px Wenkai');await document.fonts.ready;await new Promise((ok,no)=>{if(aud.readyState>=1)ok();else{aud.addEventListener('loadedmetadata',ok,{once:true});aud.addEventListener('error',()=>no(Error('音频加载失败')),{once:true})}});draw(0);$('status').textContent='点击播放';return true})();
 window.videoReady.catch(e=>$('status').textContent=e.message);
}
