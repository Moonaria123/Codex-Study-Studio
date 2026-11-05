(() => {'use strict';
const DATA=JSON.parse(document.getElementById('hub-content').textContent),KEY=DATA.storageKey,MODULES=window.HubModules;
const TZ=DATA.timeZone, PREFIX=DATA.downloadPrefix, COURSE=DATA.courseTitle;
const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x)),chapters=new Map(DATA.chapters.map(c=>[String(c.id),c]));
const labels={mindmap:'Mind maps',flashcards:'Flashcards',quiz:'Practice tests'};
const defaults=()=>({schema:1,moduleId:DATA.moduleId,maps:{},drafts:{},history:[],libraries:{},settings:{light:false}});
let store=defaults(),active=null,saveTimer=null,toastTimer=null,currentRoute={page:'home'},storageOK=true,dialogResolve=null;
function e(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined&&text!==null)node.textContent=String(text);return node;}
function add(parent,...children){parent.append(...children.filter(Boolean));return parent;}
function button(label,handler,cls='',id){const b=e('button',cls,label);b.type='button';if(id)b.id=id;b.addEventListener('click',handler);return b;}
function notify(message){clearTimeout(toastTimer);$('hub-toast').textContent=message;$('hub-toast').hidden=false;toastTimer=setTimeout(()=>$('hub-toast').hidden=true,4500);}
function warn(message){$('hub-warning').textContent=message;$('hub-warning').hidden=false;}
function unsafeKeys(value){if(!value||typeof value!=='object')return false;return Object.keys(value).some(k=>['__proto__','prototype','constructor'].includes(k)||unsafeKeys(value[k]));}
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const stringList=value=>Array.isArray(value)&&value.every(v=>typeof v==='string');
const pageList=value=>Array.isArray(value)&&value.every(v=>Number.isInteger(v)&&v>0);
const stringMap=value=>plain(value)&&Object.values(value).every(v=>typeof v==='string');
function validSnapshotItem(item){return plain(item)&&['itemId','question','correctAnswer','topic','section','explanation','pitfall'].every(k=>typeof item[k]==='string')&&pageList(item.pages)&&stringList(item.statements)&&stringList(item.steps)&&stringMap(item.options)&&stringMap(item.optionAnalysis)&&(item.selected===null||typeof item.selected==='string')&&(item.correct===null||typeof item.correct==='boolean')&&Number.isFinite(item.marks)&&item.marks>0&&Number.isFinite(item.earned)&&item.earned>=0&&item.earned<=item.marks;}
const validChapterId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value);
function validChapterSnapshot(c,chapterId){return plain(c)&&String(c.id)===chapterId&&typeof c.title==='string'&&Array.isArray(c.cards)&&c.cards.length<=5000&&c.cards.every(x=>plain(x)&&['id','question','answer','explanation','section','topic','kind','hint','pitfall'].every(k=>typeof x[k]==='string')&&pageList(x.pages))&&Array.isArray(c.questions)&&c.questions.length<=5000&&c.questions.every(x=>plain(x)&&typeof x.id==='string'&&typeof x.stem==='string'&&stringMap(x.options)&&typeof x.answer==='string'&&Object.hasOwn(x.options,x.answer)&&pageList(x.pages)&&Number.isFinite(x.marks)&&x.marks>0);}
function validateStore(value){
 if(!value||value.schema!==1||value.moduleId!==DATA.moduleId||unsafeKeys(value))throw Error('This is not a compatible study backup for this course.');
 const next=defaults();
 for(const key of ['maps','drafts','libraries']){if(value[key]===null||typeof value[key]!=='object'||Array.isArray(value[key]))throw Error('The backup has an invalid '+key+' section.');next[key]=value[key];}
 if(!Array.isArray(value.history)||value.history.length>5000)throw Error('The history section is invalid.');
 for(const [key,d] of Object.entries(next.drafts))if(!plain(d)||!['flashcards','quiz'].includes(d.kind)||!validChapterId(d.chapterId)||key!==d.kind+':'+d.chapterId||!Number.isFinite(d.elapsedMs)||d.elapsedMs<0||typeof d.id!=='string'||!plain(d.state)||!validChapterSnapshot(d.chapterSnapshot,d.chapterId)||(d.lastReport&&(!Array.isArray(d.lastReport.items)||!d.lastReport.items.every(validSnapshotItem))))throw Error('A saved session is invalid.');
 for(const r of value.history){if(!plain(r)||typeof r.id!=='string'||typeof r.sessionId!=='string'||!validChapterId(r.chapterId)||!['flashcards','quiz'].includes(r.kind)||!['paused','completed'].includes(r.status)||!['practice','exam','self-assessment'].includes(r.mode)||!Array.isArray(r.items)||r.items.length>5000||!Number.isFinite(r.elapsedMs)||r.elapsedMs<0||!Number.isFinite(r.earned)||!Number.isFinite(r.max)||r.earned<0||r.earned>r.max||!Number.isInteger(r.total)||r.total!==r.items.length||!Number.isInteger(r.answered)||r.answered<0||r.answered>r.total||!Number.isFinite(Date.parse(r.recordedAt)))throw Error('A history snapshot is invalid.');for(const item of r.items)if(!validSnapshotItem(item))throw Error('A snapshot question is invalid.');}
 for(const [key,state] of Object.entries(next.maps))if(!validChapterId(key)||!plain(state))throw Error('A saved map is invalid.');
 next.history=value.history;next.settings={light:!!value.settings?.light};return next;
}
try{const raw=localStorage.getItem(KEY);if(raw)store=validateStore(JSON.parse(raw));localStorage.setItem(KEY+'-probe','1');localStorage.removeItem(KEY+'-probe');}catch(error){storageOK=false;warn('Browser storage is unavailable or saved data could not be read. You can still study in this tab. Export a backup in Data & backup before closing it. Existing browser data has not been overwritten.');}
function persist(){clearTimeout(saveTimer);saveTimer=null;if(!storageOK)return false;try{localStorage.setItem(KEY,JSON.stringify(store));$('hub-storage').textContent='Saved in this browser · '+new Date().toLocaleTimeString('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit'});return true;}catch(_){storageOK=false;warn('Browser storage is full or unavailable. Current work is still in this tab. Export a backup in Data & backup before closing it.');return false;}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(persist,150);}
function id(){return globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
function time(ms){const sec=Math.floor(Math.max(0,ms)/1000),hours=Math.floor(sec/3600);return (hours?hours+':':'')+String(Math.floor(sec/60)%60).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function date(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('en-GB',{timeZone:TZ,dateStyle:'medium',timeStyle:'short'}):'Unknown date';}
function ask(title,message,choices){
 return new Promise(resolve=>{if(dialogResolve){resolve('cancel');return;}dialogResolve=resolve;$('hub-dialog-title').textContent=title;$('hub-dialog-message').textContent=message;$('hub-dialog-actions').replaceChildren(...choices.map(c=>button(c.label,()=>closeDialog(c.value),c.class||'',c.id)));$('hub-dialog').showModal();});
}
function closeDialog(value){const resolve=dialogResolve;dialogResolve=null;$('hub-dialog').close();if(resolve)resolve(value);}
$('hub-dialog').addEventListener('cancel',event=>{event.preventDefault();closeDialog('cancel');});
const confirm=async({title,message,confirmLabel='Continue'})=>(await ask(title,message,[{value:'cancel',label:'Cancel',id:'hub-confirm-cancel'},{value:'yes',label:confirmLabel,class:'primary',id:'hub-confirm-yes'}]))==='yes';
function elapsed(){return active?.draft?active.draft.elapsedMs+(active.tick!==null?performance.now()-active.tick:0):0;}
function commitElapsed(){if(active?.draft&&active.tick!==null){active.draft.elapsedMs+=Math.max(0,performance.now()-active.tick);active.tick=performance.now();}}
function capture(){if(!active)return;const state=active.controller?.getState();if(active.kind==='mindmap'){if(state)store.maps[active.chapterId]=clone(state);return;}commitElapsed();if(state)active.draft.state=clone(state);const report=active.controller?.getReport();if(report){active.draft.lastReport=clone(report);active.draft.answered=report.answered;active.draft.total=report.total;}active.draft.updatedAt=new Date().toISOString();store.drafts[active.key]=active.draft;}
function completedSession(sessionId){return store.history.some(r=>r.sessionId===sessionId&&r.status==='completed');}
function sealed(record){return record.mode==='exam'&&record.status==='paused'&&!completedSession(record.sessionId);}
function record(report,status,draft){
 const snapshot={...clone(report),id:id(),sessionId:draft.id,kind:draft.kind,chapterId:draft.chapterId,chapterTitle:draft.chapterSnapshot?.title||chapters.get(draft.chapterId)?.title||'Chapter '+draft.chapterId,status,startedAt:draft.startedAt,recordedAt:new Date().toISOString(),elapsedMs:Math.round(draft.elapsedMs),contentVersion:draft.contentVersion};
 store.history.unshift(snapshot);return snapshot;
}
function stop(){if(active){active.controller?.destroy();active=null;}}
async function leave(){
 if(!active)return true;
 if(active.kind==='mindmap'){capture();persist();stop();return true;}
 const leaving=active;
 const decision=await ask('Leave this study session?','Save your place to resume from Home, or discard this unfinished progress and start from the first item next time. Existing history records remain available.',[
  {value:'cancel',label:'Keep studying',id:'hub-exit-cancel'},
  {value:'discard',label:'Discard progress',class:'danger',id:'hub-exit-discard'},
  {value:'save',label:'Save and exit',class:'primary',id:'hub-exit-save'}]);
 if(decision==='cancel'||active!==leaving)return false;
 capture();const draft=active.draft;
 if(decision==='save'){const report=active.controller.getReport();if(report?.answered>0)record(report,'paused',draft);}else delete store.drafts[active.key];
 stop();persist();return true;
}
async function navigate(route){if(!(await leave()))return;render(route);}
function heading(kicker,title,description){return add(e('div','hub-hero'),e('p','eyebrow',kicker),e('h1','',title),description?e('p','',description):null);}
function setTheme(){document.body.classList.toggle('light',store.settings.light);$('hub-theme').textContent=store.settings.light?'Dark theme':'Light theme';$('hub-theme').setAttribute('aria-pressed',String(store.settings.light));window.dispatchEvent(new Event('hub-theme-change'));}
function render(route){
 currentRoute=route;const view=$('hub-view');view.replaceChildren();view.className='hub-main';for(const name of ['home','history','mistakes','data'])$('nav-'+name).setAttribute('aria-current',route.page===name?'page':'false');
 if(route.page==='home')renderHome(view);else if(route.page==='chapters')renderChapters(view,route.kind);else if(route.page==='history')renderHistory(view);else if(route.page==='snapshot')renderSnapshot(view,route.id);else if(route.page==='mistakes')renderMistakes(view);else if(route.page==='data')renderData(view);
 view.focus({preventScroll:true});window.scrollTo(0,0);
}
function renderHome(view){
 add(view,heading('LEARN · RECALL · APPLY','Build knowledge. Test understanding.','Choose a tool, then a chapter. Resume your saved place, compare past attempts and return to the concepts that need more work.'));
 const grid=e('div','hub-grid');for(const [kind,icon,desc] of [['mindmap','⌘','Explore connected concepts. Expand, search, zoom and export your map.'],['flashcards','▤','Recall an answer, reveal the explanation and assess your understanding.'],['quiz','✓','Apply the concepts to multiple-choice questions in practice or timed exam mode.']].filter(([kind])=>DATA.chapters.some(c=>c.modules.includes(kind)))){
  const card=e('section','hub-tile');add(card,e('span','tile-icon',icon),e('h2','',labels[kind]),e('p','',desc),button('Choose a chapter →',()=>navigate({page:'chapters',kind}),'primary','open-'+kind));grid.append(card);
 }view.append(grid);
 const saved=Object.values(store.drafts).filter(d=>chapters.has(d.chapterId)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 const section=add(e('section','hub-section'),e('h2','','Continue studying'));
 if(!saved.length)section.append(e('p','muted','Saved flashcard and test sessions will appear here. Your mind-map view is restored when you open that chapter.'));
 for(const d of saved){const row=e('div','hub-row');add(row,add(e('div'),e('h3','',labels[d.kind]+' · Chapter '+d.chapterId),e('p','',`${d.answered||0} of ${d.total||'?'} answered · ${time(d.elapsedMs)} active time · ${date(d.updatedAt)}`)),button('Resume where I left off',()=>openSession(d.kind,d.chapterId), 'primary'));row.dataset.draftKey=d.kind+':'+d.chapterId;section.append(row);}view.append(section);
 add(view,add(e('div','hub-panel'),e('h3','','One growing study library'),e('p','muted',`${DATA.chapters.length} chapters available. Each chapter uses the same learning tools, progress records and review notebook. New chapters can be added without changing how you study.`),e('p','small','Use Exit session to choose Save or Discard. Closing or reloading the browser tab automatically saves your current place.')));
}
function renderChapters(view,kind){
 add(view,heading('CHOOSE A CHAPTER',labels[kind],'Each chapter opens inside this study file.'));const grid=e('div','hub-grid');
 for(const c of DATA.chapters.filter(c=>c.modules.includes(kind))){const count=kind==='mindmap'?countNodes(c.root):kind==='flashcards'?c.cards.length:c.questions.length,d=store.drafts[kind+':'+c.id];const card=e('section','hub-tile');add(card,e('p','eyebrow','Chapter '+c.number),e('h2','',c.title),e('p','',count+' '+(kind==='mindmap'?'knowledge nodes':kind==='flashcards'?'revision cards':'questions')));const actions=e('div','hub-actions');if(d)actions.append(button('Resume saved session',()=>openSession(kind,c.id),'primary'));actions.append(button(kind==='mindmap'?'Open mind map':d?'Start a new session':'Start studying',()=>openSession(kind,c.id,{fresh:!!d}),'',`chapter-${kind}-${c.id}`));card.append(actions);grid.append(card);}view.append(grid);
}
function countNodes(n){return 1+(n.children||[]).reduce((sum,c)=>sum+countNodes(c),0);}
async function openSession(kind,chapterId,options={}){
 chapterId=String(chapterId);if(!(await leave()))return;
 const chapter=chapters.get(chapterId);if(!chapter||!chapter.modules.includes(kind)||!MODULES[kind]){notify('This learning tool is not available for this chapter.');return;}
 const key=kind+':'+chapterId;let draft=kind==='mindmap'?null:store.drafts[key];
 if(draft&&options.fresh){if(!(await confirm({title:'Start a new attempt?',message:'This replaces the unfinished progress for this tool and chapter. Previous history snapshots are kept.',confirmLabel:'Start new attempt'})))return;delete store.drafts[key];draft=null;}
 if(kind!=='mindmap'&&!draft){draft={id:id(),kind,chapterId,startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),elapsedMs:0,contentVersion:DATA.contentVersion,chapterSnapshot:clone(chapter),state:options.subsetIds?{subsetIds:options.subsetIds}:null,answered:0,total:kind==='quiz'?chapter.questions.length:chapter.cards.length};store.drafts[key]=draft;}
 const view=$('hub-view');view.replaceChildren();view.className='hub-main'+(kind==='mindmap'?' wide':'');currentRoute={page:'session',kind,chapterId};for(const n of ['home','history','mistakes','data'])$('nav-'+n).setAttribute('aria-current','false');
 const bar=e('div','hub-session-bar');add(bar,add(e('div'),e('h1','',labels[kind]+' · Chapter '+chapterId),e('p','small',chapter.title)));
 const actions=e('div','hub-actions');if(kind!=='mindmap')actions.append(button('Save progress',()=>{capture();const ok=persist();notify(ok?'Progress saved. Resume this session from Home.':'Progress is held in this tab. Export a backup before closing.');},'','hub-save-progress'));
 actions.append(button(kind==='mindmap'?'Back to chapters':'Exit session',()=>navigate({page:'chapters',kind}),'','hub-exit-session'));bar.append(actions);view.append(bar);
 const container=e('div','hub-module');container.id='hub-module';container.dataset.kind=kind;view.append(container);
 active={kind,chapterId,key,draft,controller:null,tick:document.hidden?null:performance.now()};const token=active;
 try{const controller=MODULES[kind].mount({container,chapter:kind==='mindmap'?chapter:(draft.chapterSnapshot||chapter),state:kind==='mindmap'?clone(store.maps[chapterId]||null):clone(draft.state),
  getElapsedMs:()=>active===token?elapsed():draft?.elapsedMs||0,
  onChange(next){if(active!==token)return;if(kind==='mindmap')store.maps[chapterId]=clone(next);else{draft.state=clone(next);capture();}scheduleSave();},
  onRestart(){if(active!==token||!draft)return;draft.id=id();draft.startedAt=new Date().toISOString();draft.elapsedMs=0;draft.answered=0;draft.lastReport=null;active.tick=document.hidden?null:performance.now();},
  onComplete(report){if(active!==token||!draft||token.completionQueued)return;token.completionQueued=true;const finished=clone(report);queueMicrotask(()=>{if(active!==token)return;if(dialogResolve)closeDialog('cancel');capture();const snapshot=record(finished,'completed',draft);delete store.drafts[key];stop();persist();render({page:'snapshot',id:snapshot.id});});},
  notify,confirm:args=>active===token?confirm(args):Promise.resolve(false),getLibrary:()=>clone(store.libraries[chapterId]||null),saveLibrary(value){if(active!==token)return false;store.libraries[chapterId]=clone(value);persist();return true;}
 });if(active===token){active.controller=controller;capture();persist();}}catch(error){stop();warn('This study view could not open: '+error.message);render({page:'home'});}
 window.scrollTo(0,0);
}
function filters(onChange,includeStatus=false){const box=e('div','hub-filter no-print'),fields={};for(const [key,title,choices] of [['chapter','Chapter',[['all','All chapters'],...DATA.chapters.map(c=>[c.id,'Chapter '+c.number])]],['kind','Tool',[['all','All tools'],['flashcards','Flashcards'],['quiz','Practice tests']]],...(includeStatus?[['status','Record',[['all','All records'],['completed','Completed'],['paused','Saved checkpoints']]]]:[])]){const label=e('label','',title),select=e('select');select.id='filter-'+key;for(const [value,name] of choices){const option=e('option','',name);option.value=value;select.append(option);}select.addEventListener('change',()=>onChange(Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]))));fields[key]=select;label.append(select);box.append(label);}return box;}
function renderHistory(view){
 add(view,heading('YOUR LEARNING RECORD','History','Open a saved checkpoint or a completed attempt to inspect the exact questions, responses and explanations recorded at that time.'));
 const list=e('div','hub-list');function populate(f={chapter:'all',kind:'all',status:'all'}){list.replaceChildren();const records=store.history.filter(r=>(f.chapter==='all'||r.chapterId===f.chapter)&&(f.kind==='all'||r.kind===f.kind)&&(f.status==='all'||r.status===f.status));if(!records.length){list.append(e('div','empty-state','No matching history yet. Save and exit after answering, or finish an attempt to create a record.'));return;}
 for(const r of records){const row=e('div','hub-row');row.dataset.recordId=r.id;const closed=sealed(r),score=closed?'Score hidden until submission':`${r.earned} / ${r.max}${r.kind==='flashcards'?' self-assessed':''}`;add(row,add(e('div'),e('h3','',`${labels[r.kind]} · Chapter ${r.chapterId}`),e('p','',`${date(r.recordedAt)} · ${r.status==='paused'?'Saved checkpoint':'Completed'} · ${score} · ${time(r.elapsedMs)}`)),button('View snapshot',()=>navigate({page:'snapshot',id:r.id})));list.append(row);}}
 view.append(filters(populate,true),list);populate();
}
function itemView(item,index,kind,hideAnswers=false){
 const article=e('article','snapshot-item print-entry');article.dataset.itemId=item.itemId;
 const meta=e('div','snapshot-meta');add(meta,e('span','hub-badge',(index+1)+'. '+item.itemId),e('span','',item.topic||''),e('span','',`${item.marks||1} ${(item.marks||1)===1?'mark':'marks'}`));article.append(meta);
 if(item.scenario)add(article,item.scenarioTitle?e('h3','',item.scenarioTitle):null,e('p','',item.scenario));article.append(e('h3','',item.question));
 if(item.statements?.length){const list=e('ol');list.type='I';for(const s of item.statements)list.append(e('li','',s));article.append(list);}
 if(item.options&&Object.keys(item.options).length)for(const [key,text] of Object.entries(item.options)){let cls='answer-option';if(!hideAnswers&&key===item.correctAnswer)cls+=' correct-option';if(!hideAnswers&&key===item.selected&&item.correct===false)cls+=' wrong-option';const suffix=(key===item.selected?' · Your choice':'')+(!hideAnswers&&key===item.correctAnswer?' · Correct answer':'');article.append(e('div',cls,`${key}. ${text}${suffix}`));}
 const response=kind==='flashcards'?(item.selected==='known'?'Got it':item.selected==='review'?'Needs review':'Not assessed'):(item.selected||'No answer');article.append(e('p','',`${kind==='flashcards'?'Your recall':'Your answer'}: ${response}`));
 if(hideAnswers){article.append(e('p','hub-note','Answers and marking are hidden while this exam attempt can still be resumed. Submit the attempt to reveal them.'));return article;}
 const verdict=item.correct===null?'Unanswered':kind==='flashcards'?(item.correct?'Self-assessed: Got it':'Self-assessed: Needs review'):(item.correct?'Correct':'Incorrect');article.append(e('p','verdict '+(item.correct===true?'correct':item.correct===false?'incorrect':''),verdict));
 const explanation=e('div','snapshot-explanation');add(explanation,e('h4','','Correct answer'),e('p','',item.options?.[item.correctAnswer]?item.correctAnswer+' — '+item.options[item.correctAnswer]:item.correctAnswer),e('h4','','Explanation'),e('p','',item.explanation||''));
 if(item.optionAnalysis&&Object.keys(item.optionAnalysis).length){explanation.append(e('h4','','Why each option is right or wrong'));for(const [key,value] of Object.entries(item.optionAnalysis))explanation.append(e('p','',key+'. '+value));}
 if(item.steps?.length){explanation.append(e('h4','','Reasoning steps'));const list=e('ol');for(const step of item.steps)list.append(e('li','',step));explanation.append(list);}
 if(item.pitfall)add(explanation,e('h4','','Common pitfall'),e('p','',item.pitfall));if(item.examTip)add(explanation,e('h4','','Exam technique'),e('p','',item.examTip));
 explanation.append(e('p','source',`${item.section?'Source section / locator '+item.section:'Source section / locator not supplied'} · ${(item.pages||[]).length?'Printed pages '+item.pages.join(', '):'Printed pages not supplied'}`));article.append(explanation);return article;
}
function renderSnapshot(view,recordId){
 const r=store.history.find(x=>x.id===recordId);if(!r){view.append(e('p','','This record is not available.'));return;}const hidden=sealed(r);
 add(view,heading('READ-ONLY SNAPSHOT',labels[r.kind]+' · Chapter '+r.chapterId,`${r.chapterTitle} · ${date(r.recordedAt)} · ${r.status==='completed'?'Completed attempt':'Saved checkpoint'}`));
 const actions=e('div','hub-actions no-print');actions.append(button('Back to history',()=>navigate({page:'history'})));const draft=Object.values(store.drafts).find(d=>d.id===r.sessionId);if(draft)actions.append(button('Resume this session',()=>openSession(draft.kind,draft.chapterId),'primary'));
 if(hidden)actions.append(button('End attempt and reveal answers',async()=>{
  if(!(await confirm({title:'End this exam attempt?',message:'Submit the most recently saved answers for this attempt and reveal marking and explanations. This attempt will no longer be resumable.',confirmLabel:'End and reveal'})))return;
  const latest=store.history.filter(x=>x.sessionId===r.sessionId).sort((a,b)=>String(b.recordedAt).localeCompare(String(a.recordedAt)))[0]||r;
  const report=draft?.lastReport||latest,d=draft||{id:latest.sessionId,kind:latest.kind,chapterId:latest.chapterId,chapterSnapshot:{title:latest.chapterTitle},startedAt:latest.startedAt,elapsedMs:latest.elapsedMs,contentVersion:latest.contentVersion};
  const finished=record(report,'completed',d);if(draft)delete store.drafts[draft.kind+':'+draft.chapterId];persist();render({page:'snapshot',id:finished.id});
 },'','hub-end-exam'));view.append(actions);
 const stats=e('div','hub-stat-grid hub-section');for(const [value,label] of [[hidden?'Pending':`${r.earned} / ${r.max}`,r.kind==='flashcards'?'Self-assessed score':'Score'],[time(r.elapsedMs),'Active study time'],[`${r.answered} / ${r.total}`,'Answered'],[r.status==='completed'?'Completed':'Paused','Record status']])stats.append(add(e('div','hub-stat'),e('strong','',value),e('span','',label)));view.append(stats);
 view.append(e('p','small hub-section','This is a frozen record. Reviewing it does not change your score, current progress or mistake counts.'));r.items.forEach((item,i)=>view.append(itemView(item,i,r.kind,hidden)));
}
function fingerprint(text){let value=2166136261;for(let i=0;i<text.length;i++){value^=text.charCodeAt(i);value=Math.imul(value,16777619);}return(value>>>0).toString(16);}
function mistakes(){
 const map=new Map();for(const r of [...store.history].sort((a,b)=>String(a.recordedAt).localeCompare(String(b.recordedAt)))){if(sealed(r)||(r.mode==='exam'&&r.status==='paused'&&completedSession(r.sessionId)))continue;for(const item of r.items){if(item.correct!==false)continue;const key=[r.kind,r.chapterId,item.itemId,fingerprint(item.question+'|'+item.correctAnswer+'|'+JSON.stringify(item.options||{}))].join(':');let entry=map.get(key);if(!entry){entry={key,kind:r.kind,chapterId:r.chapterId,attempts:new Set()};map.set(key,entry);}entry.attempts.add(r.sessionId);entry.item=item;entry.recordId=r.id;entry.lastAt=r.recordedAt;}}
 return [...map.values()].map(x=>({...x,count:x.attempts.size})).sort((a,b)=>b.count-a.count||String(b.lastAt).localeCompare(String(a.lastAt)));
}
function renderMistakes(view){
 add(view,heading('FOCUS YOUR NEXT REVIEW','Mistake notebook','Review incorrect test answers and flashcards marked Needs review. Counts are per attempt; saving the same attempt again does not add another error.'));
 view.append(e('div','print-heading',COURSE+' · Mistake notebook · '+new Date().toLocaleDateString('en-GB',{timeZone:TZ})));const actions=e('div','hub-actions no-print');actions.append(button('Print / Save as PDF',()=>window.print(),'primary','hub-print-mistakes'));view.append(actions);
 const list=e('div'),practice=e('div','hub-actions no-print');let selected=[];
 function populate(f={chapter:'all',kind:'all'}){selected=mistakes().filter(r=>(f.chapter==='all'||r.chapterId===f.chapter)&&(f.kind==='all'||r.kind===f.kind));list.replaceChildren();practice.replaceChildren();
 if(!selected.length){list.append(e('div','empty-state','No mistakes in this selection. Incorrect answers and Needs review ratings appear after a recorded attempt or saved checkpoint. Unanswered questions are shown in history.'));return;}
 const groups=new Map();for(const entry of selected){const key=entry.kind+':'+entry.chapterId;if(!groups.has(key))groups.set(key,{kind:entry.kind,chapterId:entry.chapterId,ids:[]});groups.get(key).ids.push(entry.item.itemId);}
 for(const group of groups.values())if(chapters.has(group.chapterId))practice.append(button(`Practise Chapter ${group.chapterId} ${group.kind==='quiz'?'test mistakes':'review cards'}`,()=>openSession(group.kind,group.chapterId,{fresh:true,subsetIds:[...new Set(group.ids)]})));
 selected.forEach((entry,i)=>{const wrapper=e('section','mistake-entry');wrapper.dataset.mistakeKey=entry.key;const meta=e('div','hub-flex hub-spread');add(meta,e('p','verdict',`${entry.kind==='quiz'?'Incorrect':'Marked Needs review'} in ${entry.count} ${entry.count===1?'attempt':'attempts'} · Chapter ${entry.chapterId}`),button('View last record',()=>navigate({page:'snapshot',id:entry.recordId}),'no-print'));add(wrapper,meta,itemView(entry.item,i,entry.kind));list.append(wrapper);});
 }view.append(filters(populate),practice,list);populate();
}
function download(blob,name){const url=URL.createObjectURL(blob),a=e('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(plain(value))return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value);}
function renderData(view){
 add(view,heading('KEEP YOUR LEARNING RECORD','Data & backup','Your progress, map views, snapshots, card edits and mistake records stay in this browser. A backup lets you move them to another browser or keep them before updating the HTML file.'));
 add(view,add(e('div','hub-panel'),e('h3','','Export or restore'),e('p','muted','Download one JSON backup containing all saved study data. Import replaces the current study data only after confirmation. The chapter content is included in the HTML itself.')));
 const actions=e('div','hub-data-actions');add(actions,button('Export complete backup (JSON)',()=>{capture();const payload={...clone(store),exportedAt:new Date().toISOString(),appContentVersion:DATA.contentVersion};download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),PREFIX+'_Study_Backup_'+new Date().toLocaleDateString('en-CA',{timeZone:TZ})+'.json');notify('Study backup downloaded.');},'primary','hub-export-data'),button('Import complete backup (JSON)',()=>$('hub-import-file').click(),'','hub-import-data'));view.append(actions);
 const historyPanel=add(e('div','hub-panel'),e('h3','','Portable HTML history archive'),e('p','muted','Export every recorded attempt to a single HTML file that you can open independently to browse questions, choices, scores, time and explanations. Import an archive to merge its history into this hub; duplicate records are skipped, and current progress, map views and card edits remain unchanged.'));
 const historyActions=e('div','hub-data-actions');add(historyActions,button('Export history HTML',()=>{const markup=window.HubArchive.makeHTML({moduleId:DATA.moduleId,courseTitle:COURSE,timeZone:TZ,history:clone(store.history),sealedSessionIds:[...new Set(store.history.filter(sealed).map(r=>r.sessionId))],exportedAt:new Date().toISOString()});download(new Blob([markup],{type:'text/html;charset=utf-8'}),PREFIX+'_History_'+new Date().toLocaleDateString('en-CA',{timeZone:TZ})+'.html');notify('HTML history archive downloaded. Open it directly or import it into this hub.');},'primary','hub-export-history'),button('Import history HTML',()=>$('hub-import-history-file').click(),'','hub-import-history'));historyPanel.append(historyActions,e('p','small',`${store.history.length} saved history records. Unsubmitted exams keep their answers hidden until the attempt is ended in the study hub.`));view.append(historyPanel);
 add(view,add(e('div','hub-panel'),e('h3','','Updating this study file'),e('p','muted','Keep the same HTML filename and local folder when replacing it with a newer edition. Export a backup first, then import it if the browser does not restore your data. Existing question IDs and chapter IDs are kept stable as new chapters are added.'),e('p','small','Private browsing, cleared website data, different browser profiles or a different local file path can separate or remove browser storage. Exporting a backup is the portable way to retain it.')));
 add(view,add(e('div','hub-panel'),e('h3','','Leaving an assessment'),e('p','muted','Exit session and the navigation buttons offer Save and exit, Discard progress, or Keep studying. Save and exit adds a history checkpoint after you answer an item. Discard removes only unfinished progress; earlier history remains. Closing or reloading the tab automatically saves progress.')));
 view.append(e('p','small',`Available content: ${DATA.chapters.length} chapters · ${DATA.contentVersion}. Flashcard scores are self-assessments.`));
}
$('hub-import-file').addEventListener('change',async event=>{const file=event.target.files[0];try{if(!file)return;if(file.size>15000000)throw Error('Choose a backup smaller than 15 MB.');const incoming=validateStore(JSON.parse(await file.text()));if(active)throw Error('Exit the current session before importing a backup.');if(!(await confirm({title:'Replace current study data?',message:`Import ${incoming.history.length} history records and ${Object.keys(incoming.drafts).length} saved sessions? Export your current data first if you want to retain it.`,confirmLabel:'Import and replace'})))return;store=incoming;storageOK=true;setTheme();persist();render({page:'data'});notify('Study data restored. Resume saved sessions from Home.');}catch(error){notify('Import was not applied: '+error.message);}finally{event.target.value='';}});
$('hub-import-history-file').addEventListener('change',async event=>{const file=event.target.files[0];try{
 if(!file)return;if(file.size>40000000)throw Error('Choose an HTML history archive smaller than 40 MB.');
 const payload=window.HubArchive.parseHTML(await file.text());const incoming=validateStore({...defaults(),moduleId:payload.moduleId,history:payload.history}).history;
 if(active)throw Error('Exit the current session before importing history.');
 const existing=new Map(store.history.map(r=>[r.id,r])),unique=new Map();let duplicates=0;
 for(const r of incoming){const previous=existing.get(r.id)||unique.get(r.id);if(previous){if(canonical(previous)!==canonical(r))throw Error('A record ID conflicts with a different history snapshot. No records were imported.');duplicates++;}else unique.set(r.id,r);}
 if(!unique.size){notify(`All ${duplicates} records are already present. Nothing changed.`);return;}
 if(store.history.length+unique.size>5000)throw Error('The merged archive would exceed 5,000 history snapshots.');
 if(!(await confirm({title:'Merge this HTML history?',message:`Add ${unique.size} history records and skip ${duplicates} duplicates? Your current answer progress, mind maps and card edits will be kept.`,confirmLabel:'Merge history'})))return;
 store.history=[...store.history,...unique.values()].sort((a,b)=>String(b.recordedAt).localeCompare(String(a.recordedAt)));persist();render({page:'data'});notify(`Imported ${unique.size} history records. ${duplicates} duplicates skipped.`);
 }catch(error){notify('History import was not applied: '+error.message);}finally{event.target.value='';}});
for(const name of ['home','history','mistakes','data'])$('nav-'+name).addEventListener('click',()=>navigate({page:name}));$('hub-brand').addEventListener('click',()=>navigate({page:'home'}));$('hub-theme').addEventListener('click',()=>{store.settings.light=!store.settings.light;setTheme();scheduleSave();});
document.addEventListener('visibilitychange',()=>{if(active){capture();active.tick=document.hidden?null:performance.now();persist();}});
window.addEventListener('pagehide',()=>{capture();persist();});
window.addEventListener('beforeunload',event=>{capture();const saved=persist();if(active?.draft&&!saved){event.preventDefault();event.returnValue='';}});
setInterval(()=>{if(active?.draft&&!document.hidden){capture();persist();}},3000);
setTheme();render({page:'home'});
})();
