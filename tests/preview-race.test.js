import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Node {
 constructor(tag){this.tagName=tag;this.children=[];this.className='';this.text='';this.style={};this.dataset={};this.hidden=false;this.open=false;this.attributes={};}
 append(...items){for(const n of items){n.parent=this;this.children.push(n);}}
 replaceChildren(...items){this.children=[];this.append(...items);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 setAttribute(k,v){this.attributes[k]=v;}
 set textContent(v){this.text=String(v);this.children=[];}
 get textContent(){return this.text+this.children.map(n=>n.textContent??'').join(' ');}
 querySelector(selector){const cls=selector.startsWith('.')?selector.slice(1):null;return this.children.map(n=>n.className===cls?n:n.querySelector?.(selector)).find(Boolean)||null;}
 closest(){return null;}
 get isConnected(){return !!this.parent;}
 getBoundingClientRect(){return {left:0,top:0,right:800,bottom:600,width:800,height:600};}
}
const find=(n,pred)=>{if(pred(n))return n;for(const c of n.children){const hit=find(c,pred);if(hit)return hit;}return null;};
test('an older preview status response cannot overwrite a just-authorized static preview',async()=>{
 let resolveStatus;
 const api=(route,body)=>{
  if(route.endsWith('/preview')&&body===undefined)return new Promise(resolve=>{resolveStatus=resolve;});
  if(route.endsWith('/preview')&&body)return Promise.resolve({projectId:'p',state:'ready',generation:'g2',url:'http://127.0.0.1:6001',message:'Static build preview is ready.'});
  throw Error('unexpected route '+route);
 };
 const body=new Node('body');body.classList={contains:()=>false};body.className='';
 const document={body,createElement:tag=>new Node(tag)};
 const window={addEventListener(){},workspacePreview:null};
 const pane=new Node('aside');
 const context=vm.createContext({window,document,api,ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>fn(),setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync(new URL('../src/dashboard/preview.js',import.meta.url),'utf8'),context);
 window.workspacePreview.mount({studioProject:'p'},pane);
 const button=find(pane,n=>n.tagName==='button'&&n.text==='Authorize & open preview');assert.ok(button);
 await button.onclick();
 resolveStatus({projectId:'p',state:'authorization_required',message:'Start your application separately, then authorize its exact local URL.'});
 await new Promise(setImmediate);
 const status=find(pane,n=>n.className==='preview-status');
 assert.doesNotMatch(status.textContent,/Start your application separately/);
 assert.match(status.textContent,/Preview loading/);
});
