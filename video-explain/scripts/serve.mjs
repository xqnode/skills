import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css','.wav':'audio/wav','.mp3':'audio/mpeg','.mp4':'video/mp4','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
export async function serveFiles(directory,port=0){
 const root=fs.realpathSync(directory);
 const server=http.createServer((req,res)=>{try{
  const raw=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=fs.realpathSync(path.resolve(root,'.'+(raw==='/'?'/index.html':raw)));
  const rel=path.relative(root,file);
  if(rel.startsWith('..')||path.isAbsolute(rel)||rel.split(path.sep).some(x=>x.startsWith('.'))){res.writeHead(403).end();return;}
  const stat=fs.statSync(file);if(!stat.isFile())throw Error('not a file');
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/),size=stat.size;
  const start=range?Number(range[1]):0,end=range?.[2]?Math.min(Number(range[2]),size-1):size-1;
  if(req.headers.range&&(!range||start>end||start>=size)){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
  res.writeHead(range?206:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes','Content-Length':Math.max(0,end-start+1),...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
  if(req.method==='HEAD'||size===0){res.end();return;}fs.createReadStream(file,{start,end}).pipe(res);
 }catch{res.writeHead(404).end();}});
 server.listen(port,'127.0.0.1');await once(server,'listening');return server;
}
