import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {lookup} from 'node:dns/promises';
import {randomBytes,createHash} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';

const fail=(message,status=400)=>{throw new ApiError(status,message);};
const loopback=ip=>ip==='127.0.0.1'||ip==='::1';
const reserved=new Set([2375,2376,5432,6379,9222,9229,15672,27017]);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
// Only a deliberately authorized development server is reachable. This is a
// browser/network boundary, not a sandbox for the server's own native process.
export function previewURL(value,hub){
 let url;try{url=new URL(value);}catch{fail('Enter a complete local HTTP application URL.');}
 if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/')fail('Use a local HTTP origin with no credentials, path, query or fragment.');
 const port=Number(url.port||80);if(port<1024||reserved.has(port)||port===Number(new URL(hub).port||80))fail('This port is reserved or belongs to Dev Squad. Choose the project application server.');
 return url;
}
export function previewPath(value){
 let decoded=value;try{for(let i=0;i<3;i++)decoded=decodeURIComponent(decoded);}catch{fail('Invalid application path.');}
 if(!decoded.startsWith('/')||decoded.startsWith('//')||/[\\\u0000-\u001f]/.test(decoded)||decoded.split(/[/?#]/).some(p=>p==='..')||/(?:^|\/)(?:\.env[^/]*|\.git|\.aws|\.ssh|backups|credentials|@fs)(?:\/|$)|\/api\/(?:console|team)|(?:^|\/)(?:admin|debug|billing|generate|inference)(?:\/|$)/i.test(decoded)||/(?:^|\/)(?:data|\.codex|\.claude|\.npmrc|secrets?)(?:[/?#]|$)|\.(?:sqlite(?:3)?|db|pem|key|pfx|p12)(?:[?#]|$)/i.test(decoded)||/[?&](?:token|key|password|secret|authorization)=/i.test(decoded))fail('Sensitive or unsupported application path is blocked.',403);
 return value;
}
export class WorkspacePreview {
 constructor(studio,{resolve=lookup,leaseMs=3600000}={}){this.studio=studio;this.resolve=resolve;this.leaseMs=leaseMs;this.sessions=new Map();this.pending=new Set();this.closed=false;}
 status(id){this.studio.team.store.project(id);const s=this.sessions.get(id);return s?{projectId:id,url:s.url?s.url.origin:s.origin,generation:s.generation,state:Date.now()>=s.expires?'authorization_required':s.state,message:Date.now()>=s.expires?'Authorization expired. Authorize this preview again.':s.message,expires:s.expires,frame:`/api/console/studio/projects/${id}/preview/frame?generation=${s.generation}`,external:`/api/console/studio/projects/${id}/preview/external?generation=${s.generation}`}:{projectId:id,state:'authorization_required',message:'Open a static index.html or authorize the exact local URL of a running application server.'};}
 current(id,generation){this.studio.team.store.project(id);const s=this.sessions.get(id);if(!s||s.generation!==generation||Date.now()>=s.expires)fail('Preview authorization expired or belongs to another project.',403);return s;}
 async addresses(url){const records=await this.resolve(url.hostname.replace(/^\[|\]$/g,''),{all:true});if(!records.length||records.some(r=>!loopback(r.address)))fail('The application hostname must resolve only to loopback.',403);return records;}
 async authorize(id,value,hub){if(this.closed)fail('Preview service is closed.',409);if(this.pending.has(id))fail('A preview authorization is already in progress for this project.',409);this.pending.add(id);try{return await this.authorizeServer(id,value,hub);}finally{this.pending.delete(id);}}
 async authorizeServer(id,value,hub){this.studio.team.store.project(id);const url=previewURL(value,hub);let addresses;try{addresses=await this.addresses(url);}catch(e){if(e instanceof ApiError)throw e;fail('Local hostname could not be resolved.');}
  this.revoke(id,true);const host=`p-${randomBytes(16).toString('hex')}.localhost`,s={url,hub,addresses,generation:randomBytes(16).toString('hex'),expires:Date.now()+this.leaseMs,state:'server_running',message:'Checking the authorized server.'};
  s.server=http.createServer({requestTimeout:5000,headersTimeout:5000},(req,res)=>this.proxy(s,req,res));s.server.setTimeout(5000,socket=>socket.destroy());s.server.on('upgrade',(_req,socket)=>socket.destroy());
  await new Promise((ok,no)=>{s.server.once('error',no);s.server.listen(0,'127.0.0.1',ok);});s.server.unref();if(this.closed){s.server.close();fail('Preview service is closed.',409);}s.origin=`http://${host}:${s.server.address().port}`;this.sessions.set(id,s);
  await this.probe(s);return this.status(id);
 }
 async authorizeStatic(id,hub){this.studio.team.store.project(id);if(this.closed)fail('Preview service is closed.',409);if(this.pending.has(id))fail('A preview authorization is already in progress for this project.',409);const project=this.studio.root(id);try{this.staticFile(project,'index.html');}catch(e){if(e.status===404)fail('This project has no index.html to preview. Enter the URL of its running application server instead.');throw e;}this.pending.add(id);try{this.revoke(id,true);const s={staticProject:project,hub,generation:randomBytes(16).toString('hex'),expires:Date.now()+this.leaseMs,state:'ready',message:'Static build preview is ready.'};s.server=http.createServer({requestTimeout:5000,headersTimeout:5000},(req,res)=>this.serveStatic(s,req,res));s.server.setTimeout(5000,socket=>socket.destroy());s.server.on('upgrade',(_req,socket)=>socket.destroy());await new Promise((ok,no)=>{s.server.once('error',no);s.server.listen(0,'127.0.0.1',ok);});s.server.unref();if(this.closed){s.server.close();fail('Preview service is closed.',409);}s.origin=`http://127.0.0.1:${s.server.address().port}`;this.sessions.set(id,s);return this.status(id);}finally{this.pending.delete(id);}}
 serveStatic(s,req,res){const done=(status,text,headers={})=>{if(res.headersSent)return;res.writeHead(status,{'content-type':'text/plain; charset=utf-8','content-security-policy':"default-src 'none'; frame-ancestors "+s.hub,'cache-control':'no-store','x-content-type-options':'nosniff',...headers});res.end(req.method==='HEAD'?undefined:text);};try{if(Date.now()>=s.expires)fail('Preview authorization expired.',403);if(req.headers.host!==new URL(s.origin).host)fail('Unrecognized preview host.',403);if(!['GET','HEAD'].includes(req.method))fail('Only reading static preview files is supported.',405);const target=previewPath(req.url);let relative;try{relative=decodeURIComponent(target.split('?')[0]);}catch{fail('Invalid preview path.',403);}if(!relative.startsWith('/'))fail('Invalid preview path.',403);relative=relative.slice(1)||'index.html';if(relative.endsWith('/'))relative+='index.html';if(/(?:^|\/)(?:AGENTS(?:\.override)?\.md|\.[^/]+|references)(?:\/|$)/i.test(relative))fail('That file is not part of the preview.',403);const body=this.staticFile(s.staticProject,relative),type=types[path.extname(relative).toLowerCase()]||'application/octet-stream',policy=`default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${s.hub}`;done(200,body,{'content-type':type,'content-security-policy':policy});}catch(e){done(e.status||403,this.clean(e.message));}}
 staticFile(project,relative){
  let fd;
  try{
   const file=project.resolve(relative);
   const before=fs.lstatSync(file,{bigint:true});
   if(!before.isFile()||before.nlink!==1n)fail('Preview file is not a regular project file.',403);
   fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
   const opened=fs.fstatSync(fd,{bigint:true});
   const current=fs.lstatSync(project.resolve(relative),{bigint:true});
   if(!opened.isFile()||opened.nlink!==1n||opened.dev!==before.dev||opened.ino!==before.ino||opened.dev!==current.dev||opened.ino!==current.ino)fail('Preview file changed while opening.',403);
   const limit=2*1024*1024;
   if(opened.size>BigInt(limit))fail('Preview file exceeds the 2 MiB limit.',413);
   const body=Buffer.alloc(Number(opened.size)+1);
   let length=0,n;
   while(length<body.length&&(n=fs.readSync(fd,body,length,body.length-length,null)))length+=n;
   if(length===body.length)fail('Preview file changed while reading.',409);
   return body.subarray(0,length);
  }catch(e){
   if(e.code==='ENOENT'||e.code==='ENOTDIR')fail('Preview file not found.',404);
   throw e;
  }finally{if(fd!==undefined)fs.closeSync(fd);}
 }
 revoke(id,internal=false){this.studio.team.store.project(id);if(!internal&&this.pending.has(id))fail('Wait for the current preview authorization to finish before revoking it.',409);const s=this.sessions.get(id);if(s){s.server.closeAllConnections();s.server.close();this.sessions.delete(id);}}
 close(){this.closed=true;for(const id of this.sessions.keys())this.revoke(id,true);}
 async request(s,target,method='GET',body=null,headers={}){
  if(Date.now()>=s.expires)fail('Preview authorization expired.',403);previewPath(target);
  const records=await this.addresses(s.url);if(records.map(r=>r.address).sort().join()!==s.addresses.map(r=>r.address).sort().join())fail('Local address changed. Reauthorize the server.',403);
  return new Promise((ok,no)=>{let size=0,parts=[],settled=false;const end=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);error?no(error):ok(result);};
   const req=http.request({hostname:s.addresses[0].address,port:s.url.port,path:target,method,agent:false,headers:{host:s.url.host,'accept-encoding':'identity',...headers}},res=>{res.on('data',part=>{size+=part.length;if(size>2097152){req.destroy();end(Error('Application response exceeds the 2 MiB preview limit.'));}else parts.push(part);});res.on('end',()=>end(null,{status:res.statusCode,headers:res.headers,body:Buffer.concat(parts)}));res.on('error',()=>end(Error('Application response was interrupted.')));});
   const timer=setTimeout(()=>{req.destroy();end(Error('Application did not respond within 3 seconds.'));},3000);req.on('error',e=>end(Error(e.code==='ECONNREFUSED'?'Server not started. Start the application separately.':'Application connection failed.')));if(body)req.write(body);req.end();
  });
 }
 framing(r){return !!r.headers['x-frame-options']||String(r.headers['content-security-policy']||'').split(';').some(v=>/^\s*frame-ancestors\s/i.test(v)&&!v.includes('*'));}
 async probe(s){if(s.staticProject){try{this.staticFile(s.staticProject,'index.html');s.state='ready';s.message='Static build preview is ready.';}catch(e){s.state='unavailable';s.message=this.clean(e.message);}return;}try{let target='/';for(let n=0;n<4;n++){const r=await this.request(s,target);if([301,302,303,307,308].includes(r.status)){const next=new URL(r.headers.location,s.url.origin+target);if(next.origin!==s.url.origin)fail('Application redirects outside its authorized origin.',403);target=previewPath(next.pathname+next.search);continue;}s.state=this.framing(r)?'embedding_blocked':r.status>=400?'unavailable':'server_running';s.message=s.state==='embedding_blocked'?'The application restricts embedding. Its security headers are preserved. Use Open externally.':r.status>=400?`Application returned HTTP ${r.status}.`:'Server is running. The preview is loading.';return;}fail('Too many application redirects.');}catch(e){s.state=e.message.includes('Server not started')?'server_not_started':'unavailable';s.message=this.clean(e.message);}}
 clean(value){let text=String(value);const secrets=this.studio.team.coordinator.configuredSecrets();for(const secret of secrets)if(secret)text=text.split(secret).join('[private value removed]');return text.slice(0,16000);}
 async proxy(s,req,res){try{
  if(Date.now()>=s.expires)fail('Preview authorization expired.',403);
  if(req.headers.host!==new URL(s.origin).host)fail('Unrecognized preview host.',403);
  const origin=req.headers.origin,referer=req.headers.referer;let ref=null;try{if(referer)ref=new URL(referer).origin;}catch{fail('Invalid preview source.',403);}
  if(origin&&origin!==s.origin||ref&&![s.origin,s.hub].includes(ref)||!ref&&req.headers['sec-fetch-site']!=='same-origin')fail('Open this preview from its authorized workspace.',403);
  if(!['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(req.method))fail('Unsupported application method.',403);
  const target=previewPath(req.url);let size=0,parts=[];for await(const part of req){size+=part.length;if(size>131072)fail('Application form is too large.',413);parts.push(part);}
  // Never forward browser credentials, even to an owner-authorized server.
  const headers={};for(const key of ['accept','content-type'])if(req.headers[key])headers[key]=req.headers[key];if(origin)headers.origin=origin;
  const r=await this.request(s,target,req.method,Buffer.concat(parts),headers);
  if(r.headers['content-encoding']&&r.headers['content-encoding']!=='identity')fail('Compressed preview responses are unsupported.',403);
  if(r.headers.location){const next=new URL(r.headers.location,s.url.origin+target);if(next.origin!==s.url.origin)fail('Navigation outside the authorized application is blocked.',403);previewPath(next.pathname+next.search);r.headers.location=next.pathname+next.search;}
  const type=String(r.headers['content-type']||'');if(/text|javascript|json|xml/.test(type)){const text=r.body.toString();if(this.studio.team.coordinator.configuredSecrets().some(secret=>secret&&text.includes(secret))||/-----BEGIN .*PRIVATE KEY-----|\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,})/.test(text))fail('Application content contains a private value. Preview blocked.',403);}
  for(const key of ['content-type','content-security-policy','x-frame-options','location','referrer-policy'])if(r.headers[key])res.setHeader(key,r.headers[key]);
  // A second CSP only tightens the application's original policy. It never
  // permits other services, third-party scripts, popups, workers or sockets.
  const policy=`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors ${s.hub}`;
  res.setHeader('Content-Security-Policy',[...(r.headers['content-security-policy']?[r.headers['content-security-policy']]:[]),policy]);res.setHeader('Cache-Control','no-store');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.headers['sec-fetch-dest']==='iframe'||req.headers['sec-fetch-dest']==='document'){s.lastPath=target;s.state=this.framing(r)?'embedding_blocked':r.status>=400?'unavailable':'ready';s.message=s.state==='ready'?'Application document loaded.':s.state==='embedding_blocked'?'Application security headers restrict embedding. Use Open externally.':`Application returned HTTP ${r.status}.`;}
  res.writeHead(r.status);res.end(req.method==='HEAD'?undefined:r.body);
 }catch(e){s.state='unavailable';s.message=this.clean(e.message);if(!res.headersSent)res.writeHead(e.status||403,{'content-type':'text/plain','content-security-policy':"default-src 'none'; frame-ancestors "+s.hub,'cache-control':'no-store'});res.end(this.clean(e.message));}}
 frame(id,generation,res){const s=this.current(id,generation);const script=`document.querySelector('iframe').addEventListener('load',()=>parent.postMessage({type:'workspace-preview-loaded',projectId:${JSON.stringify(id)},generation:${JSON.stringify(generation)}},${JSON.stringify(s.hub)}));`;
  const hash=createHash('sha256').update(script).digest('base64');res.set('Content-Security-Policy',`default-src 'none'; frame-src ${s.origin}; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; frame-ancestors 'self'`).type('html').send(`<html><head><meta name="referrer" content="origin"><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;background:#fff}</style></head><body><iframe title="Authorized project application" sandbox="allow-scripts allow-forms allow-same-origin" src="${s.origin}/"></iframe><script>${script}</script></body></html>`);
 }
}
