/* StudyMate PDF uploads and focused pages. Does not replace the existing exam engine. */
(()=>{
const $=id=>document.getElementById(id);
const style=document.createElement('style');style.textContent=`
.sm-page-hidden{display:none!important}
.sm-upload{border:1px dashed #a999d4;border-radius:14px;background:#faf8ff;padding:17px;margin:14px 0}
.sm-upload label{display:block;font-weight:650;margin-bottom:8px}
.sm-upload input[type=file]{width:100%;padding:8px;background:white;border-radius:9px}
.sm-upload .sm-pdf-status{font-size:13px;color:#675c7f;margin:8px 0}
.sm-upload select{width:100%;padding:10px;border:1px solid #dcd3ed;border-radius:9px;background:white}
.sm-quick-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
.sm-quick-actions button{padding:11px 14px;border:1px solid #dcd3ed;border-radius:10px;background:#f1ebff;color:#4c2b94;cursor:pointer}
.sm-quick-actions button:hover{background:#e6dbff}
.sm-dashboard{display:block}
.sm-focused-heading{font-size:14px;color:#62567d;margin-bottom:12px}
`;document.head.append(style);
const hero=document.querySelector('.hero'),dashboard=$('smDashboard'),lesson=$('lesson'),course=$('coursePanel'),exam=$('examPanel'),planner=$('plannerPanel'),right=document.querySelector('.rightstack');
const panels={home:dashboard,learning:lesson,course,exam,planner};
function focusPage(page){
 if(page==='course')page='learning';
 if(!['home','learning','exam','planner'].includes(page))page='home';
 hero?.classList.toggle('sm-page-hidden',page!=='learning');
 dashboard?.classList.toggle('sm-page-hidden',page!=='home');
 lesson?.classList.toggle('sm-page-hidden',page!=='learning');
 course?.classList.toggle('sm-page-hidden',page!=='learning');
 exam?.classList.toggle('sm-page-hidden',page!=='exam');
 planner?.classList.toggle('sm-page-hidden',page!=='planner');
 right?.classList.add('sm-page-hidden');
 if(course&&page==='learning')course.hidden=false;
 if(planner&&page==='planner')planner.hidden=false;
 if(exam&&page==='exam')exam.classList.add('show');
 document.querySelectorAll('.sidebar [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===(page==='learning'?'course':page)));
 document.querySelector('.appmain')?.scrollIntoView({block:'start'});
 try{sessionStorage.setItem('sm-active-page',page)}catch{}
}
window.smFocusPage=focusPage;
// Capture click before legacy navigation, which otherwise shows multiple panels at once.
document.querySelectorAll('.sidebar [data-nav]').forEach(b=>b.addEventListener('click',e=>{
 e.stopImmediatePropagation();e.preventDefault();
 const nav=b.dataset.nav;focusPage(nav==='learn'?'home':nav==='course'?'learning':nav==='exam'?'exam':nav==='planner'?'planner':nav==='quiz'?'exam':'learning');
},true));
// Allow existing subject shortcuts and generated lesson links to open the learning page.
document.querySelectorAll('[data-topic]').forEach(b=>b.addEventListener('click',()=>focusPage('learning'),true));
$('go')?.addEventListener('click',()=>focusPage('learning'),true);
$('generateCourse')?.addEventListener('click',()=>focusPage('learning'),true);
$('generateExam')?.addEventListener('click',()=>focusPage('exam'),true);
// Keep legacy showCourse/showExam calls on their own page.
const originalShowCourse=window.showCourse;if(typeof originalShowCourse==='function')window.showCourse=function(...args){focusPage('learning');return originalShowCourse(...args)};
const originalShowExam=window.showExam;if(typeof originalShowExam==='function')window.showExam=function(...args){focusPage('exam');return originalShowExam(...args)};
if(dashboard){const title=document.createElement('div');title.innerHTML='<h2>Welcome to your learning dashboard</h2><p class="muted">Track your practice results, revisit weak areas, and continue learning.</p>';dashboard.prepend(title);
 const actions=document.createElement('div');actions.className='sm-quick-actions';actions.innerHTML='<button data-page="learning">📚 Start learning</button><button data-page="exam">🏆 Full exam</button><button data-page="planner">▦ Study planner</button>';dashboard.append(actions);actions.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>focusPage(b.dataset.page));}
// PDF extraction is server-side, transient, and is never stored as an uploaded file.
let active={learning:null,exam:null};
function addUploader(parent,mode){if(!parent)return;const wrap=document.createElement('div');wrap.className='sm-upload';wrap.innerHTML=`<label for="sm-pdf-${mode}">📄 Upload PDF for ${mode==='exam'?'exam questions':'learning notes'}</label><input id="sm-pdf-${mode}" type="file" accept="application/pdf,.pdf"><div class="sm-pdf-status" role="status">Optional. Upload a text-based PDF (up to 8 MB and 80 pages).</div><label for="sm-source-${mode}">How should StudyMate AI use it?</label><select id="sm-source-${mode}">${mode==='exam'?'<option value="similar">Generate similar questions (recommended)</option><option value="original">Practise questions from the PDF</option><option value="mastery">Topic mastery and examiner tricks</option>':'<option value="reference">Teach using the PDF</option><option value="only">Focus on PDF topics</option>'}</select><button type="button" class="outline sm-clear" style="margin-top:10px">Clear PDF</button>`;
 const input=wrap.querySelector('input'),status=wrap.querySelector('.sm-pdf-status');input.onchange=async()=>{active[mode]=null;const file=input.files?.[0];if(!file)return;if(file.size>8*1024*1024){status.textContent='PDF too large. Maximum 8 MB.';return}status.textContent='Reading PDF…';const form=new FormData();form.append('file',file);try{const r=await fetch('/api/pdf/extract',{method:'POST',body:form});const d=await r.json();if(!r.ok)throw Error(d.detail||'Could not read PDF');active[mode]={text:d.text,name:d.filename};
  status.textContent=`Ready: ${d.filename} (${d.pages} pages). ${d.message||'Text extracted.'}`;
  const topicField=mode==='exam'?$('examTopic'):$('topic');
  if(topicField){const suggested=d.filename.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
    if(suggested && (!topicField.value.trim() || !topicField.dataset.pdfEdited)){
      topicField.value=suggested.slice(0,180);topicField.dataset.pdfSuggested='true';
    }
  }}catch(e){status.textContent=e.message}};
 wrap.querySelector('.sm-clear').onclick=()=>{active[mode]=null;input.value='';status.textContent='PDF cleared. Enter a topic or upload another PDF.';const field=mode==='exam'?$('examTopic'):$('topic');if(field?.dataset.pdfSuggested==='true'){field.value='';delete field.dataset.pdfSuggested}};parent.prepend(wrap);
}
addUploader(course,'learning');addUploader(exam,'exam');
// Intercept API requests to attach uploaded text to lesson/course/exam requests.
const oldFetch=window.fetch.bind(window);window.fetch=function(resource,options){const url=typeof resource==='string'?resource:resource?.url||'';const mode=url.includes('/api/exam')?'exam':url.includes('/api/course')||url.includes('/api/lesson')?'learning':null;
 if(mode&&active[mode]&&options?.body&&typeof options.body==='string'){
  try{const payload=JSON.parse(options.body);payload.source_text=active[mode].text;const sel=$('sm-source-'+mode);payload.source_mode=sel?.value||'reference';options={...options,body:JSON.stringify(payload)};}catch(e){console.warn('PDF reference was not attached',e)}
 }
 return oldFetch(resource,options);
};
// Keep exam questions and their solutions in the existing exam panel.
focusPage(sessionStorage.getItem('sm-active-page')||'home');
})();
