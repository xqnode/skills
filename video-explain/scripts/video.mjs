// Common explain-kit route; historical web-request projects retain their protocol.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {serveFiles} from './serve.mjs';
import {checkProject} from './project-check.mjs';
const args=process.argv.slice(2),action=args[0],here=path.dirname(fileURLToPath(import.meta.url));
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
function run(command,argv){const r=spawnSync(command,argv,{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
if(action==='motion'){run(process.execPath,[path.join(here,'legacy-video.mjs'),...args]);process.exit(0);}
if(!['preview','check','render'].includes(action)||!option('--project')){
 console.log('node video.mjs preview|check|render --project <目录> [--output output/片名-v1.mp4] [--browser msedge|chrome] [--allow-short-demo]\nnode video.mjs motion --file <视频>');process.exit(1);
}
const project=fs.realpathSync(option('--project'));
const scene=JSON.parse(fs.readFileSync(path.join(project,'scene.json'),'utf8'));
if(!scene.schema&&scene.legs){run(process.execPath,[path.join(here,'legacy-video.mjs'),...args]);process.exit(0);}
if(scene.schema!=='explain-v1')throw Error('不支持的scene.json协议');
run(process.env.PYTHON||'python',[path.join(here,'pipeline.py'),'timeline','--project',project]);
if(action==='preview'){
 const server=await serveFiles(project,Number(option('--port',0)));console.log(`http://127.0.0.1:${server.address().port}/`);
 await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});server.close();
}else{
 const browser=option('--browser'),allowShort=args.includes('--allow-short-demo');
 const report=await checkProject(project,{browserName:browser,allowShort});
 console.log(JSON.stringify({browserCheck:'passed',duration:report.duration,chapters:report.chapters}));
 const common=['--page',path.join(project,'index.html'),'--root',project,...(browser?['--browser',browser]:[])];
 if(action==='check')run(process.execPath,[path.join(here,'scene.mjs'),'lint',...common]);
 else{
  if(option('--fps','30')!=='30')throw Error('通用整片输出固定30fps');
  const output=option('--output');if(!output)throw Error('请指定--output output/片名-v1.mp4，不覆盖旧版');
  const resolved=path.resolve(project,output),outRoot=path.join(project,'output');
  if(path.dirname(resolved)!==outRoot)throw Error('整片必须导出到项目output目录');
  run(process.execPath,[path.join(here,'scene.mjs'),'video',...common,'--output',path.basename(resolved),'--full',...(allowShort?['--allow-short-demo']:[])]);
 }
}
