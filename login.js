
const db=supabase.createClient(CFG.url,CFG.key),$=id=>document.getElementById(id);
$("wall").innerHTML=[0,1,2,3].map(c=>{const s=[0,1,2].map(k=>`<img src="img/c${(c*3+k)%12+1}.jpg" alt="">`).join("");return`<div class="col">${s+s}</div>`}).join("");
$("bubs").innerHTML=Array.from({length:8},()=>{const s=8+Math.random()*26;return`<span class="bub" style="width:${s}px;height:${s}px;left:${Math.random()*100}%;animation-duration:${8+Math.random()*10}s;animation-delay:${Math.random()*8}s"></span>`}).join("");
$("ttl").innerHTML=[..."Welcome back"].map((c,i)=>`<span style="animation-delay:${.7+i*.04}s">${c===" "?"&nbsp;":c}</span>`).join("");
let busy=0;addEventListener("mousemove",e=>{if(busy)return;busy=1;requestAnimationFrame(()=>{busy=0;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;$("f").style.transform=`perspective(900px) rotateY(${x*8}deg) rotateX(${-y*8}deg)`})});
$("eye").onclick=()=>{$("pw").type=$("pw").type==="password"?"text":"password"};
if(location.hash.includes("type=recovery"))location.replace("reset.html"+location.hash);
let signup=false,otpMode=false,cap="",cool=0;
const msg=(m,ok)=>{$("err").style.color=ok?"var(--tx)":"";$("err").textContent=m};
if(new URLSearchParams(location.search).get("reset"))msg("Password updated ✅ Log in with your new password.",1);
if(CFG.turnstile){const t=document.createElement("script");t.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";t.onload=()=>turnstile.render("#cf",{sitekey:CFG.turnstile,callback:k=>cap=k,"expired-callback":()=>cap=""});document.head.appendChild(t)}
const resetCap=()=>{cap="";if(CFG.turnstile&&window.turnstile)turnstile.reset()};
const fail=m=>{$("go").disabled=false;msg(m);const w=$("cw");w.classList.remove("shake");void w.offsetWidth;w.classList.add("shake")};
$("mode").onclick=e=>{e.preventDefault();signup=!signup;$("name").hidden=$("phone").hidden=!signup;$("name").required=$("phone").required=signup;$("go").textContent=signup?"Create my account":"Enter the Gallery";$("mode").textContent=signup?"Already have an account? Log in":"New here? Create an account";$("pw").minLength=signup?10:0;$("consent").hidden=!signup;$("ok").required=signup;$("forgot").hidden=signup;msg("")};
async function needOtp(){const{data:a}=await db.auth.mfa.getAuthenticatorAssuranceLevel();return !!a&&a.nextLevel==="aal2"&&a.currentLevel!=="aal2"}
async function enter(){const{data:adm}=await db.rpc("is_admin");document.body.classList.add("enter");setTimeout(()=>location.href=adm?"admin.html":"index.html",1100)}
$("f").onsubmit=async e=>{e.preventDefault();if($("hp").value)return;$("go").disabled=true;msg("");
 if(otpMode){const{data:f}=await db.auth.mfa.listFactors();const fac=f&&f.totp&&f.totp[0];if(!fac)return fail("No 2-step factor found.");
  const v=await db.auth.mfa.challengeAndVerify({factorId:fac.id,code:$("otp").value.trim()});if(v.error)return fail("Wrong code. Try again 💜");return enter()}
 if(CFG.turnstile&&!cap)return fail("Please complete the check first 💜");
 const em=$("email").value.trim(),pw=$("pw").value,ct=cap||undefined;
 const r=signup?await db.auth.signUp({email:em,password:pw,options:{captchaToken:ct,data:{full_name:$("name").value.trim(),phone:$("phone").value.trim()}}}):await db.auth.signInWithPassword({email:em,password:pw,options:{captchaToken:ct}});
 resetCap();
 if(r.error)return fail(signup?r.error.message:"Wrong email or password 💜");
 if(!r.data.session){$("go").disabled=false;return msg("Check your email to confirm your account, then log in 💜",1)}
 if(await needOtp()){otpMode=true;$("email").hidden=$("pwbox").hidden=$("mode").hidden=$("forgot").hidden=true;$("otp").hidden=false;$("otp").focus();$("go").textContent="Verify code";$("go").disabled=false;return msg("Open your authenticator app and type the 6-digit code 🔐",1)}
 enter()};
$("forgot").onclick=async e=>{e.preventDefault();const em=$("email").value.trim();
 if(!em)return msg("Type your email above first 💜");
 if(Date.now()<cool)return msg("Please wait a minute before asking again 💜");
 if(CFG.turnstile&&!cap)return msg("Please complete the check first 💜");
 cool=Date.now()+60000;
 const{error}=await db.auth.resetPasswordForEmail(em,{redirectTo:location.origin+"/reset.html",captchaToken:cap||undefined});resetCap();
 const lim=error&&/limit/i.test(error.message);
 msg(lim?"Too many requests. Try again in a few minutes 💜":"If that email has an account, a reset link is on its way. Check spam too 💜",!lim)};
db.auth.getSession().then(async({data})=>{if(!data.session)return;if(await needOtp()){await db.auth.signOut();return}
 const{data:a}=await db.rpc("is_admin");$("err").style.color="var(--tx)";$("err").innerHTML=`You are already signed in 👑<br><a href="${a?"admin.html":"index.html"}">Continue</a> · <a href="#" id="so">Sign out</a>`;$("so").onclick=async e=>{e.preventDefault();await db.auth.signOut();location.reload()}});
