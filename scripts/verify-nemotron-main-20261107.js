// Look at the owner's actual dashboard. Only the explicit free-access check
// may POST; this script never saves roles, approves work or starts an agent.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const out='docs/verification/nemotron-integration-20261107/main-browser',base='http://127.0.0.1:3000',project='aceea0a7-7c8b-4b32-9371-cf94a029a6ee',session='b1e11259-d5f7-427e-b004-c66d9a818fe3';
fs.mkdirSync(out,{recursive:true});const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const checks=[],errors=[],blocked=[];let browser,access=null;
const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(u.origin===base&&(['GET','HEAD'].includes(q.method())||q.method()==='POST'&&u.pathname==='/api/console/studio/nemotron/check'))return r.continue();blocked.push({method:q.method(),path:u.pathname});return r.abort();});
 const response=await page.goto(base+'/team#project/'+project+'/chat/'+session);await page.waitForFunction(id=>state.studioDetail?.id===id&&!state.busy,session);
 check('Actual regular dashboard and existing Expense session load',response.status()===200);
 check('No executions or approval were added',await page.evaluate(()=>!state.studioDetail.executions.length&&!state.studioDetail.state.runApproval));
 check('Existing roles preserved',await page.evaluate(()=>JSON.stringify(state.studioDetail.state.roles)===JSON.stringify({builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'})));
 await page.getByRole('button',{name:'Three-agent team',exact:true}).click();const execution=page.locator('#chat-execution-tools');if(await execution.getAttribute('open')===null)await execution.locator(':scope > summary').click();const roles=page.locator('.workspace-role-settings');if(await roles.getAttribute('open')===null)await roles.locator(':scope > summary').click();
 for(const role of ['Builder','Tester','Reviewer']){const input=page.getByRole('combobox',{name:role+' agent',exact:true});await input.waitFor();check(role+' offers Nemotron without changing selection',await input.locator('option[value="nemotron"]').count()===1&&await input.inputValue()===({Builder:'deepseek',Tester:'codex-personal',Reviewer:'claude-code'})[role]);}
 await page.screenshot({path:out+'/actual-role-choices.png',fullPage:true});
 await page.evaluate(()=>go('team'));await page.getByRole('button',{name:'Check Nemotron free access',exact:true}).waitFor();
 if(process.argv.includes('--cached'))access=JSON.parse(fs.readFileSync(out+'/result.json','utf8')).access;else{const pending=page.waitForResponse(r=>r.url().endsWith('/studio/nemotron/check')&&r.request().method()==='POST');await page.getByRole('button',{name:'Check Nemotron free access',exact:true}).click();const observed=await pending;access={httpStatus:observed.status(),result:await observed.json()};}
 check('Explicit non-generating check returns through real backend',access.httpStatus===200);
 const health=page.locator('#model-health-panel');await health.locator(':scope > summary').click();await page.getByRole('button',{name:'Refresh local readings',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.model-health-row').length===7);check('Seven actual model/profile readings load',await page.locator('.model-health-row').count()===7);
 const nm=page.locator('.model-health-row').filter({has:page.getByText('NVIDIA Nemotron',{exact:true})});await nm.locator('summary').click();const text=await nm.innerText();check('Exact model and honest live-role qualification shown',text.includes('nvidia/nemotron-3.5-super-vl:free')&&text.includes('live role performance NOT VERIFIED'));
 await page.screenshot({path:out+'/actual-model-health.png',fullPage:true});
 await page.goto(base+'/team#project/'+project+'/chat/'+session);await page.waitForFunction(id=>state.studioDetail?.id===id&&!state.busy,session);
 const preview=page.locator('#chat-preview-tools');if(await preview.getAttribute('open')===null)await preview.locator(':scope > summary').click();await page.getByText('Start your application separately, then authorize its exact local URL. Dev Squad never launches it.',{exact:true}).waitFor();
 check('Preview accurately reports separately running app required',await preview.isVisible());await page.screenshot({path:out+'/actual-preview-state.png',fullPage:true});
 check('No page errors, blocked writes or horizontal overflow',errors.length===0&&blocked.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 fs.writeFileSync(out+'/result.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,passed:checks.length,errors,blocked,access,modelRequests:0,project,session},null,2));console.log(JSON.stringify({passed:checks.length,access,errors,blocked}));
}catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({message:e.message,checks,errors,blocked,access},null,2));console.log(JSON.stringify({message:e.message,checks,errors,blocked}));process.exitCode=1;}finally{await browser?.close();}


