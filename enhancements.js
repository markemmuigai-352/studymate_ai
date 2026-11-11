/* StudyMate enhancements: navigation, full courses, optional student accounts */
let smUser = null, smAuthMode = 'login', smLastCourse = null;
const sm = id => document.getElementById(id);
const smEsc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function smEnter(){document.body.classList.add('in-app');history.replaceState(null,'','#learn');window.scrollTo(0,0);}
function smHome(){document.body.classList.remove('in-app');history.replaceState(null,'',location.pathname);window.scrollTo(0,0);}
sm('back-home').addEventListener('click', smHome);
window.addEventListener('popstate',()=>{if(location.hash==='#learn')smEnter();else smHome()});

function openAuth(mode='login'){
 smAuthMode=mode;sm('authOverlay').hidden=false;
 sm('authTitle').textContent=mode==='register'?'Create your account':'Welcome back';
 sm('authSubmit').textContent=mode==='register'?'Create account':'Log in';
 sm('authSwitch').textContent=mode==='register'?'Already registered? Log in':'New here? Create an account';
 sm('authIntro').textContent='Save your lessons and revisit your study history. Guest access remains free.';
 sm('authError').textContent='';sm('authPassword').autocomplete=mode==='register'?'new-password':'current-password';
}
function closeAuth(){sm('authOverlay').hidden=true;sm('authForm').reset();}
sm('authClose').onclick=closeAuth;
sm('authOverlay').addEventListener('click',e=>{if(e.target===sm('authOverlay'))closeAuth()});
sm('authSwitch').onclick=()=>openAuth(smAuthMode==='register'?'login':'register');
sm('account-button').onclick=async()=>{if(smUser){if(confirm('Log out of StudyMate AI?')){await fetch('/api/logout',{method:'POST'});smUser=null;sm('account-button').textContent='Log in';sm('cloudHistory').innerHTML='';}}else openAuth('login')};
sm('authForm').onsubmit=async e=>{
 e.preventDefault();sm('authError').textContent='';sm('authSubmit').disabled=true;
 try{
  const res=await fetch('/api/'+smAuthMode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:sm('authEmail').value,password:sm('authPassword').value})});
  const data=await res.json();if(!res.ok)throw Error(data.detail||'Unable to continue.');
  smUser=data.user;sm('account-button').textContent=smUser.email;closeAuth();smEnter();await loadCloudHistory();
 }catch(err){sm('authError').textContent=err.message}finally{sm('authSubmit').disabled=false}
};
async function refreshUser(){try{const r=await fetch('/api/me');if(r.ok){const d=await r.json();smUser=d.user;if(smUser){sm('account-button').textContent=smUser.email;await loadCloudHistory();}}}catch(err){console.warn('Account status unavailable',err)}}

async function loadCloudHistory(){
 if(!smUser)return;
 try{
  const res=await fetch('/api/history');if(!res.ok)throw Error('Could not load saved lessons');const data=await res.json();
  const box=sm('cloudHistory');box.innerHTML='<h4>Account history</h4>'+(data.items.length?data.items.map(item=>`<div class="saved-history"><button class="savedItem" data-cloud-id="${smEsc(item.id)}">${smEsc(item.topic)} · ${smEsc(item.level)}</button><button class="auth-switch" data-delete-id="${smEsc(item.id)}" aria-label="Delete ${smEsc(item.topic)}">Remove</button></div>`).join(''):'No saved account lessons yet.');
  data.items.forEach(item=>{box.querySelector(`[data-cloud-id="${item.id}"]`).onclick=()=>{if(item.lesson.chapters){smLastCourse=item.lesson;sm('coursePanel').hidden=false;sm('courseTopic').value=item.topic;renderCourse(item.lesson);sm('coursePanel').scrollIntoView({behavior:'smooth'})}else{const key=item.topic.toLowerCase();lessons[key]=item.lesson;current=key;tab='notes';noteMode='detailed';render();sm('lesson').scrollIntoView({behavior:'smooth'})}};box.querySelector(`[data-delete-id="${item.id}"]`).onclick=async()=>{await fetch('/api/history/'+item.id,{method:'DELETE'});loadCloudHistory()}});
 }catch(err){sm('cloudHistory').textContent=err.message}
}
async function saveToAccount(topic, level, lesson){
 if(!smUser){openAuth('register');return}
 const res=await fetch('/api/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic,level,lesson})});
 if(!res.ok){const d=await res.json();throw Error(d.detail||'Could not save lesson')}
 await loadCloudHistory();
}
function showCourse(){sm('coursePanel').hidden=false;sm('courseTopic').value=sm('topic').value||sm('courseTopic').value;sm('coursePanel').scrollIntoView({behavior:'smooth',block:'start'})}
sm('toolCourse').onclick=showCourse;
sm('generateCourse').onclick=async()=>{
 const topic=sm('courseTopic').value.trim()||sm('topic').value.trim();if(!topic){sm('courseStatus').textContent='Enter a topic first.';return}
 sm('courseStatus').textContent='Writing your complete course. This may take a minute...';sm('generateCourse').disabled=true;
 try{
  const res=await fetch('/api/course',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic,level:sm('level').value,language:sm('language').value})});
  const data=await res.json();if(!res.ok)throw Error(data.detail||'Unable to generate course');smLastCourse=data;renderCourse(data);sm('courseStatus').textContent='Your course is ready.';
 }catch(err){sm('courseStatus').textContent=err.message}finally{sm('generateCourse').disabled=false}
};
function renderCourse(course){
 const arr=v=>Array.isArray(v)?v:[];
 let html=`<div class="course-content"><div class="course-tools"><button id="coursePrint">↓ Save course as PDF</button><button id="courseSave">☆ Save to my account</button><button id="courseExpand">Expand all chapters</button></div><h2>${smEsc(course.title)}</h2><p style="white-space:pre-wrap;line-height:1.7">${smEsc(course.introduction)}</p><h3>What you will learn</h3><ul>${arr(course.objectives).map(x=>`<li>${smEsc(x)}</li>`).join('')}</ul>`;
 arr(course.chapters).forEach((ch,i)=>{
  html+=`<details class="course-chapter" ${i===0?'open':''}><summary>Chapter ${i+1}: ${smEsc(ch.title)}</summary><p style="white-space:pre-wrap;line-height:1.7">${smEsc(ch.overview)}</p>`;
  arr(ch.sections).forEach((sec,j)=>{html+=`<div class="course-section"><h3>${i+1}.${j+1} ${smEsc(sec.heading)}</h3><p>${smEsc(sec.explanation)}</p>${sec.formula?`<pre>${smEsc(sec.formula)}</pre>`:''}<h4>Worked example</h4><p>${smEsc(sec.example)}</p></div>`});
  html+='<h3>Practice and worked answers</h3>'+arr(ch.practice).map((q,j)=>`<details class="course-practice"><summary>Exercise ${j+1}: ${smEsc(q.question)}</summary><p style="white-space:pre-wrap">${smEsc(q.answer)}</p></details>`).join('');
  html+='<h3>Chapter takeaways</h3><ul>'+arr(ch.takeaways).map(x=>`<li>${smEsc(x)}</li>`).join('')+'</ul></details>';
 });
 html+='<h3>Cheat sheet</h3>'+arr(course.cheat_sheet).map(x=>`<div class="course-practice"><strong>${smEsc(x.concept)}</strong><p>${smEsc(x.explanation)}</p></div>`).join('');
 html+='<h3>Final review questions</h3>'+arr(course.final_review).map((q,i)=>`<details class="course-practice"><summary>${i+1}. ${smEsc(q.question)}</summary><p style="white-space:pre-wrap">${smEsc(q.answer)}</p></details>`).join('')+'</div>';
 sm('courseContent').innerHTML=html;
 sm('coursePrint').onclick=()=>window.print();
 sm('courseSave').onclick=async()=>{try{await saveToAccount(sm('courseTopic').value,sm('level').value,course);sm('courseStatus').textContent='Saved to your account.'}catch(err){sm('courseStatus').textContent=err.message}};
 sm('courseExpand').onclick=()=>sm('courseContent').querySelectorAll('.course-chapter').forEach(d=>d.open=true);
 if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([sm('courseContent')]).catch(console.warn);
}
// Saving lessons remains available locally for guests; signed-in students also get cloud history.
const originalSave = window.saveToAccount;
refreshUser();

// Simple offline-friendly study planner.
function smRenderPlan(items){sm('planOutput').innerHTML=items.map((item,i)=>`<label style="display:block;margin:12px 0"><input type="checkbox" data-plan-check="${i}" ${item.done?'checked':''}> Day ${i+1}: ${smEsc(item.task)}</label>`).join('');sm('planOutput').querySelectorAll('[data-plan-check]').forEach(b=>b.onchange=()=>{items[Number(b.dataset.planCheck)].done=b.checked;localStorage.setItem('sm-study-plan',JSON.stringify(items))});}
sm('planCreate').onclick=()=>{const topic=sm('planSubject').value.trim();if(!topic){sm('planOutput').textContent='Enter a study goal first.';return;}const days=Number(sm('planDays').value);const phases=['Review fundamentals and key terms','Study detailed notes and examples','Solve practice problems','Identify mistakes and revisit weak areas','Attempt a timed quiz and summarize takeaways'];const items=Array.from({length:days},(_,i)=>({task:topic+' — '+phases[i%phases.length],done:false}));localStorage.setItem('sm-study-plan',JSON.stringify(items));smRenderPlan(items)};
try{const items=JSON.parse(localStorage.getItem('sm-study-plan')||'null');if(Array.isArray(items))smRenderPlan(items)}catch(e){console.warn('Saved plan unavailable',e)}
