// Shared menus and short confirmation dialogs. Text is always inserted as text,
// never HTML, and opening a menu never runs a worker or changes a file.
(() => {
 let menu=null,opener=null;
 function closeMenu(){menu?.remove();menu=null;opener?.setAttribute('aria-expanded','false');}
 function showMenu(anchor,items,event){closeMenu();opener=anchor;anchor.setAttribute('aria-expanded','true');const box=el('div','workspace-context-menu');box.setAttribute('role','menu');box.setAttribute('aria-label','Workspace actions');menu=box;
  for(const item of items){if(!item)continue;const b=el('button',item.danger?'menu-warning':'',item.label);b.type='button';b.setAttribute('role','menuitem');b.disabled=item.disabled===true;b.onclick=()=>{closeMenu();guard(item.action);};box.append(b);}document.body.append(box);
  const rect=anchor.getBoundingClientRect(),x=event?.clientX??rect.left,y=event?.clientY??rect.bottom;box.style.left=Math.max(8,Math.min(x,innerWidth-box.offsetWidth-8))+'px';box.style.top=Math.max(8,Math.min(y,innerHeight-box.offsetHeight-8))+'px';
  box.onkeydown=e=>{const buttons=Array.from(box.querySelectorAll('button:not(:disabled)'));if(e.key==='Escape'){e.preventDefault();closeMenu();anchor.focus();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const index=buttons.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}};box.querySelector('button:not(:disabled)')?.focus();
 }
 function menuButton(label,items){const b=el('button','context-trigger','⋯');b.type='button';b.setAttribute('aria-label',label);b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded','false');b.onclick=e=>{e.preventDefault();e.stopPropagation();showMenu(b,typeof items==='function'?items():items);};return b;}
 function context(row,trigger,items){row.oncontextmenu=e=>{e.preventDefault();showMenu(trigger,typeof items==='function'?items():items,e);};row.onkeydown=e=>{if(e.key==='ContextMenu'||e.key==='F10'&&e.shiftKey){e.preventDefault();showMenu(trigger,typeof items==='function'?items():items);}};}
 function dialog(title){const modal=el('dialog','workspace-action-dialog'),header=el('div','dialog-head'),body=el('div','action-dialog-body'),error=p('','form-error'),actions=el('div','actions');error.setAttribute('role','alert');const close=()=>{modal.close();modal.remove();};const cancel=el('button','quiet','Cancel');cancel.type='button';cancel.onclick=close;header.append(el('h2','',title),Object.assign(el('button','quiet','×'),{type:'button',onclick:close,ariaLabel:'Close dialog'}));actions.append(cancel);modal.append(header,body,error,actions);modal.oncancel=()=>{modal.remove();};document.body.append(modal);modal.showModal();
  function action(label,fn,cls='primary'){const b=el('button',cls,label);b.type='button';b.onclick=async()=>{if(state.busy)return;b.disabled=true;error.textContent='';try{await guard(fn,true);}catch(e){error.textContent=e.message;}finally{b.disabled=false;}};actions.append(b);return b;}
  return {modal,body,actions,error,close,action};
 }
 async function copy(value){try{await navigator.clipboard.writeText(value);notify('Path copied.');}catch{const d=dialog('Copy path');d.body.append(p('Clipboard permission is unavailable. Select this path and copy it.'),el('pre','copyable-path',value));}}
 function confirm(title,description,label,fn){const d=dialog(title);d.body.append(p(description));d.action(label,async()=>{await fn();d.close();});return d;}
 function renameConversation(chat){const d=dialog('Rename conversation'),name=field('Conversation name',chat.title);d.body.append(name.wrap,p('Only the name changes. Messages, task requirements, tests and reviews stay unchanged.','hint'));d.action('Save conversation name',async()=>{await api('/studio/chats/'+chat.id+'/title',{title:name.input.value,version:chat.version});await refresh();d.close();});}
 document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)&&!opener?.contains(e.target))closeMenu();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
 window.workspaceControls={menu:showMenu,menuButton,context,dialog,copy,confirm,renameConversation,closeMenu};
})();
