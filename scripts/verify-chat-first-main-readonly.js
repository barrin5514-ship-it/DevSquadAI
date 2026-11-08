// Inspect the owner's running dashboard without submitting or changing records.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve('docs/verification/chat-first-main-20261106');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],blocked=[],checks=[];
try {
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const r=route.request(),url=new URL(r.url());if(url.origin!=='http://127.0.0.1:3000'||!['GET','HEAD'].includes(r.method())){blocked.push({method:r.method(),path:url.pathname});return route.abort();}return route.continue();});
 const response=await page.goto('http://127.0.0.1:3000/team#project/27453fc9-75d8-468a-a42b-b25e44a62a69/chat/1b28625d-db6a-4117-9879-52f7da5dace1');
 await page.waitForFunction(()=>typeof state!=='undefined'&&!state.busy);
 await page.locator('.chat-first').waitFor({timeout:20000});
 await page.getByRole('form',{name:'Message composer'}).waitFor();
 checks.push({name:'Regular dashboard HTTP 200',pass:response.status()===200});
 checks.push({name:'Actual chat-first workspace and composer visible',pass:await page.locator('.chat-first').isVisible()&&await page.getByRole('form',{name:'Message composer'}).isVisible()});
 checks.push({name:'Laptop viewport has no horizontal page overflow',pass:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)});
 await page.screenshot({path:path.join(out,'regular-dashboard-1366.png')});
 checks.push({name:'No browser JavaScript errors',pass:errors.length===0});
 checks.push({name:'No write or external request attempted',pass:blocked.length===0});
 const result={checks,passed:checks.filter(c=>c.pass).length,errors,blocked,readOnly:true,modelInvocations:0,url:page.url()};
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 if(checks.some(c=>!c.pass))process.exitCode=1;
} finally {await browser.close();}
