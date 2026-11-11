(()=>{
 const email='markemmuigai@gmail.com';
 const style=document.createElement('style');style.textContent='.sm-help-link{font-size:13px;color:#6a48bc;background:transparent;border:0;text-decoration:underline;cursor:pointer;padding:8px}.sm-help-footer{padding:18px 8px;text-align:center;font-size:13px;color:#766a91}';document.head.append(style);
 const sidebar=document.querySelector('.sidebar');
 if(sidebar){const foot=document.createElement('div');foot.className='sm-help-footer';const a=document.createElement('a');a.href='mailto:'+email+'?subject='+encodeURIComponent('StudyMate AI: Help or suggestion');a.textContent='Help · Questions · Suggestions';a.style.color='#d5c7ff';foot.append(a);sidebar.append(foot)}
 // Do not expose the support address in the main navigation. It is visible only when a student opens their mail app.
})();
