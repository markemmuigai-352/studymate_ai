/* Student profile: display name, optional photo, password change */
(() => {
 const $=id=>document.getElementById(id);
 const style=document.createElement('style');style.textContent=`
 #profileOverlay[hidden],#profileMenu[hidden]{display:none!important}
 #profileOverlay{position:fixed;inset:0;background:#0d0922aa;z-index:10000;display:grid;place-items:center;padding:16px}
 #profileCard{width:min(440px,100%);max-height:90vh;overflow:auto;background:white;border-radius:20px;padding:24px;color:#191337;box-shadow:0 18px 70px #0005}
 #profileCard label{display:block;margin:12px 0;font-weight:600}#profileCard input{display:block;width:100%;padding:11px;border:1px solid #ccc;border-radius:9px;margin-top:5px;box-sizing:border-box}
 #profileCard button,#profileMenu button{border:0;border-radius:9px;padding:10px 13px;cursor:pointer}#profileCard .purple{background:#6734dc;color:white}
 #profileMenu{position:fixed;top:74px;right:18%;z-index:9999;background:white;color:#1c1635;padding:10px;border-radius:12px;box-shadow:0 6px 25px #0004;min-width:160px}#profileMenu button{display:block;width:100%;text-align:left;background:white}
 #profileAvatar{width:68px;height:68px;border-radius:50%;object-fit:cover;background:#eee;display:block;margin:8px 0}
 `;document.head.append(style);
 const wrap=document.createElement('div');wrap.innerHTML=`<div id="profileMenu" hidden><button id="openProfile">My Profile</button><button id="profileHistory">My Learning</button><button id="profileLogout">Log out</button></div><div id="profileOverlay" hidden><div id="profileCard" role="dialog" aria-modal="true" aria-labelledby="profileTitle"><button id="profileClose" style="float:right">✕</button><h2 id="profileTitle">My Profile</h2><img id="profileAvatar" alt="Profile photo"><label>Display name<input id="profileName" maxlength="80" placeholder="Your name"></label><button class="purple" id="profileSaveName">Save name</button><label>Profile photo (optional, maximum 400 KB)<input id="profilePhoto" type="file" accept="image/png,image/jpeg,image/webp"></label><button id="profileRemovePhoto">Remove photo</button><hr><h3>Change password</h3><label>Current password<input type="password" id="profileCurrent" autocomplete="current-password"></label><label>New password<input type="password" id="profileNew" autocomplete="new-password" minlength="12"></label><button id="profileSuggest">Suggest a strong password</button><button id="profileToggle">Show / hide new password</button><button class="purple" id="profileChangePassword">Change password</button><p id="profileMessage" role="status"></p></div></div>`;
 document.body.append(...wrap.children);
 const msg=x=>$('profileMessage').textContent=x;
 const setUser=u=>{smUser=u;$('account-button').textContent=(u.name||u.email)+' ▾';$('profileName').value=u.name||'';$('profileAvatar').src=u.avatar||'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#eee9ff"/><circle cx="40" cy="29" r="15" fill="#7656d4"/><ellipse cx="40" cy="74" rx="29" ry="24" fill="#7656d4"/></svg>')};
 async function api(url,options={}){const r=await fetch(url,options);const d=await r.json();if(!r.ok)throw Error(d.detail||'Request failed');return d}
 const json=(method,data)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const close=()=>{$('profileOverlay').hidden=true;$('profileMenu').hidden=true};
 $('profileClose').onclick=close;$('profileOverlay').onclick=e=>{if(e.target===$('profileOverlay'))close()};
 $('account-button').onclick=()=>{if(!smUser){openAuth('login');return}$('profileMenu').hidden=!$('profileMenu').hidden};
 $('openProfile').onclick=()=>{$('profileMenu').hidden=true;setUser(smUser);msg('');$('profileOverlay').hidden=false};
 $('profileHistory').onclick=()=>{$('profileMenu').hidden=true;smEnter();document.querySelector('[data-nav="notes"]')?.click()};
 $('profileLogout').onclick=async()=>{await api('/api/logout',{method:'POST'});smUser=null;$('account-button').textContent='Log in';$('cloudHistory').innerHTML='';close()};
 $('profileSaveName').onclick=async()=>{try{const d=await api('/api/profile',json('PATCH',{name:$('profileName').value}));setUser(d.user);msg('Name saved.')}catch(e){msg(e.message)}};
 $('profilePhoto').onchange=async()=>{const f=$('profilePhoto').files[0];if(!f)return;if(f.size>400000){msg('Choose a photo smaller than 400 KB.');return}try{const fd=new FormData();fd.append('file',f);const d=await api('/api/profile/avatar',{method:'POST',body:fd});setUser(d.user);msg('Photo saved.')}catch(e){msg(e.message)}};
 $('profileRemovePhoto').onclick=async()=>{try{const d=await api('/api/profile/avatar',{method:'DELETE'});setUser(d.user);msg('Photo removed.')}catch(e){msg(e.message)}};
 $('profileSuggest').onclick=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';const bytes=new Uint8Array(22);crypto.getRandomValues(bytes);$('profileNew').value=Array.from(bytes,b=>chars[b%chars.length]).join('');$('profileNew').type='text';msg('Copy this password into your password manager before changing it.')};
 $('profileToggle').onclick=()=>{$('profileNew').type=$('profileNew').type==='password'?'text':'password'};
 $('profileChangePassword').onclick=async()=>{try{await api('/api/profile/password',json('POST',{current_password:$('profileCurrent').value,new_password:$('profileNew').value}));msg('Password updated. Please log in again.');smUser=null;$('account-button').textContent='Log in';setTimeout(()=>{close();openAuth('login')},900)}catch(e){msg(e.message)}};
 const oldRefresh=refreshUser; // existing session refresh is already running; synchronize profile after it finishes
 fetch('/api/me').then(r=>r.json()).then(d=>{if(d.user)setUser(d.user)}).catch(()=>{});
 const oldSubmit=$('authForm').onsubmit;
 $('authForm').onsubmit=async e=>{await oldSubmit(e);if(smUser)setUser(smUser)};
})();
