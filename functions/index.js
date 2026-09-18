const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Busboy = require("busboy");
admin.initializeApp();

exports.processPushJob = onDocumentCreated("push_jobs/{jobId}", async (event) => {
  const job = event.data?.data(); if (!job) return;
  const snap = await admin.firestore().collection("fcm_tokens").get();
  const tokens = snap.docs.map(d => d.id).filter(Boolean);
  if (!tokens.length) { await event.data.ref.update({status:"sent",sentCount:0,processedAt:Date.now()}); return; }
  const data = Object.fromEntries(Object.entries({
    title: job.title || "नवीन सूचना",
    body: job.body || "",
    deepLink: job.data?.deepLink || job.data?.url || "https://xrayunionmah.web.app/"
  }).map(([k,v])=>[k,String(v)]));
  let sent=0;
  for(let i=0;i<tokens.length;i+=500){
    const chunk=tokens.slice(i,i+500);
    const r=await admin.messaging().sendEachForMulticast({data,tokens:chunk});
    sent+=r.successCount;
    r.responses.forEach((x,j)=>{if(!x.success && String(x.error?.code||"").includes("registration-token-not-registered")) admin.firestore().collection("fcm_tokens").doc(chunk[j]).delete().catch(()=>{});});
  }
  await event.data.ref.update({status:"sent",sentCount:sent,processedAt:Date.now()});
});

function auth(req){const h=req.headers.authorization||"";if(!h.startsWith("Bearer "))throw new Error("Authentication required");return admin.auth().verifyIdToken(h.slice(7));}

exports.telegramPdfUpload = onRequest({secrets:["TELEGRAM_BOT_TOKEN"],cors:true,maxInstances:3},async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({ok:false,error:"POST required"});
 try{const u=await auth(req);const bb=Busboy({headers:req.headers,limits:{fileSize:4*1024*1024,files:1}});let buf=null,name="document.pdf";
 bb.on("file",(n,f,i)=>{name=i.filename||name;const a=[];f.on("data",c=>a.push(c));f.on("end",()=>buf=Buffer.concat(a));});
 bb.on("finish",async()=>{if(!buf)return res.status(400).json({ok:false,error:"PDF missing"});const chatId=process.env.TELEGRAM_CHAT_ID;if(!chatId)return res.status(500).json({ok:false,error:"TELEGRAM_CHAT_ID secret missing"});const fd=new FormData();fd.append("chat_id",chatId);fd.append("document",new Blob([buf],{type:"application/pdf"}),name);const r=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,{method:"POST",body:fd});const d=await r.json();if(!d.ok)return res.status(502).json({ok:false,error:d.description||"Telegram rejected PDF"});await admin.firestore().collection("admin_logs").add({action:"Telegram PDF upload",uid:u.uid,fileName:name,timestamp:Date.now()});res.json({ok:true,fileId:d.result.document.file_id});});
 req.pipe(bb);
 }catch(e){logger.error(e);res.status(401).json({ok:false,error:e.message});}
});

exports.masterCleanup = onRequest({cors:true},async(req,res)=>{
 try{const a=await requireAdmin(req);if(!a.isMaster)return corsJson(res,403,{ok:false,error:"Master Admin only"});if(req.method!=="POST"||req.body?.confirm!=="CONFIRM")return corsJson(res,400,{ok:false,error:"CONFIRM required"});
 const cutoff=Date.now()-120*24*60*60*1000,s=await admin.firestore().collection("admin_logs").where("timestamp","<",cutoff).get(),b=admin.firestore().batch();s.docs.forEach(x=>b.delete(x.ref));await b.commit();await admin.firestore().collection("admin_logs").add({action:"MASTER CLEANUP",deletedLogs:s.size,timestamp:Date.now(),uid:a.u.uid,by:a.name});return corsJson(res,200,{ok:true,deletedLogs:s.size});
 }catch(e){return corsJson(res,500,{ok:false,error:e.message})}
});
const crypto = require('crypto');

function cleanMobile(v){
  let x=String(v??'').replace(/\D/g,'');
  if(x.length===12 && x.startsWith('91')) x=x.slice(2);
  return x;
}
function defaultPasswordForMember(data){
  let raw=String(data?.firstName||data?.पहिले_नाव||data?.name||data?.पूर्ण_नाव||data?.fullName||'Member').trim();
  raw=raw.replace(/^(श्री\.?|श्रीमती\.?|कु\.?|सौ\.?|Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+/i,'');
  const first=(raw.split(/\s+/)[0]||'Member').replace(/[^\p{L}\p{N}]/gu,'');
  return (first||'Member')+'@1234';
}
function hashPassword(password, saltHex){
  const salt = saltHex ? Buffer.from(saltHex,'hex') : crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64, {N:16384,r:8,p:1});
  return {salt:salt.toString('hex'), hash:hash.toString('hex')};
}
function verifyPassword(password, data){
  if(!data?.passwordHash || !data?.passwordSalt) return false;
  const h = hashPassword(password, data.passwordSalt).hash;
  return crypto.timingSafeEqual(Buffer.from(h,'hex'), Buffer.from(String(data.passwordHash),'hex'));
}
async function findMemberByMobile(mobile){
  const db=admin.firestore();
  const fields=['mobile','मोबाईल','मोबाईल नंबर','मोबाईल क्रमांक','mobileNumber','phone','phoneNumber'];
  for(const f of fields){
    const vals=[mobile, Number(mobile)];
    for(const v of vals){
      try{const s=await db.collection('members').where(f,'==',v).limit(1).get(); if(!s.empty) return s.docs[0];}catch(e){/* missing/invalid index/field is harmless */}
    }
  }
  return null;
}
async function requireAdmin(req){
  const u=await auth(req);
  const email=String(u.email||u.adminEmail||'').trim().toLowerCase();
  if(u.adminType==='master'||u.role==='admin'&&u.adminEmail==='hangemahesh498@gmail.com') return {u,isMaster:true,name:u.adminName||'महेश हांगे',designation:'मुख्य ॲडमिन',doc:null};
  const snap=await admin.firestore().collection('admins').get();
  const d=u.adminId ? snap.docs.find(x=>x.id===u.adminId) : snap.docs.find(x=>String(x.data()?.email||'').trim().toLowerCase()===email);
  if(!d || d.data()?.isActive===false) throw new Error('Admin access denied');
  return {u,isMaster:false,name:d.data()?.name||'Admin',designation:d.data()?.designation||'Admin',doc:d};
}
function corsJson(res,status,payload){res.status(status).set('Cache-Control','no-store').json(payload);}


exports.adminLogin = onRequest({cors:true,maxInstances:10}, async(req,res)=>{
  try{
    if(req.method!=='POST') return corsJson(res,405,{ok:false,error:'POST required'});
    const identifier=String(req.body?.identifier||req.body?.email||'').trim().toLowerCase(), password=String(req.body?.password||'');
    if(!identifier||!password)return corsJson(res,400,{ok:false,error:'Admin ID आणि password आवश्यक आहे.'});
    let isMaster=identifier==='hangemahesh498@gmail.com'||identifier==='mahesh';
    if(isMaster){
      const expected=process.env.MASTER_ADMIN_PASSWORD||'Mahesh@1234';
      if(password!==expected)return corsJson(res,401,{ok:false,error:'Master Admin password चुकीचा आहे.'});
      const token=await admin.auth().createCustomToken('admin:master',{role:'admin',adminType:'master',adminEmail:'hangemahesh498@gmail.com',adminName:'महेश हांगे'});
      return corsJson(res,200,{ok:true,token,admin:{name:'महेश हांगे',designation:'मुख्य ॲडमिन',email:'hangemahesh498@gmail.com',isMaster:true,access:'All',permissions:[]}});
    }
    const snap=await admin.firestore().collection('admins').get();const d=snap.docs.find(x=>String(x.data()?.email||'').trim().toLowerCase()===identifier);
    if(!d||d.data()?.isActive===false)return corsJson(res,401,{ok:false,error:'Admin account सापडले नाही किंवा बंद आहे.'});
    const a=d.data()||{};let ok=verifyPassword(password,a);
    if(!ok&&a.pass&&String(a.pass)===password){const hp=hashPassword(password);await d.ref.update({passwordHash:hp.hash,passwordSalt:hp.salt,passwordVersion:1,pass:null});ok=true;}
    if(!ok)return corsJson(res,401,{ok:false,error:'Admin password चुकीचा आहे.'});
    const uid='admin:'+d.id;await d.ref.update({uid,authMode:'admin-custom-password'});
    const token=await admin.auth().createCustomToken(uid,{role:'admin',adminId:d.id,adminEmail:identifier,adminName:a.name||'Admin'});
    return corsJson(res,200,{ok:true,token,admin:{id:d.id,name:a.name||'Admin',designation:a.designation||'Admin',email:a.email||identifier,isMaster:false,access:a.access||'All',permissions:Array.isArray(a.permissions)?a.permissions:[]}});
  }catch(e){logger.error('adminLogin',e);return corsJson(res,500,{ok:false,error:e.message||'Admin login failed'});}
});

exports.memberLogin = onRequest({cors:true,maxInstances:10}, async(req,res)=>{
  try{
    if(req.method!=='POST') return corsJson(res,405,{ok:false,error:'POST required'});
    const mobile=cleanMobile(req.body?.mobile), password=String(req.body?.password||'');
    if(!/^\d{10}$/.test(mobile) || !password) return corsJson(res,400,{ok:false,error:'मोबाईल नंबर आणि पासवर्ड आवश्यक आहे.'});
    const d=await findMemberByMobile(mobile);
    if(!d) return corsJson(res,404,{ok:false,error:'हा मोबाईल नंबर नोंदणीकृत नाही.'});
    const data=d.data()||{};
    const status=String(data.status||data.स्थिती||'').trim().toLowerCase();
    if(status==='pending'||status==='प्रलंबित') return corsJson(res,403,{ok:false,error:'तुमचा सदस्य अर्ज अजून Admin मंजुरीच्या प्रतीक्षेत आहे.'});
    if(status==='rejected'||status==='नाकारले'||status==='नाकारलेले'||data.loginEnabled===false||String(data.access||data.अॅक्सेस||'').toLowerCase() === 'disabled'||String(data.access||data.अॅक्सेस||'').toLowerCase() === 'बंद') return corsJson(res,403,{ok:false,error:'तुमचा Login access बंद आहे. Admin शी संपर्क साधा.'});
    let ok=verifyPassword(password,data);
    const expected=defaultPasswordForMember(data);
    if(!ok && (!data.passwordHash || data.defaultPassword===true) && password===expected){
      const hp=hashPassword(expected);
      await d.ref.update({passwordHash:hp.hash,passwordSalt:hp.salt,passwordVersion:1,defaultPassword:true,defaultPasswordLabel:expected,defaultPasswordSetAt:Date.now(),authMode:'mobile-password'});
      ok=true;
    }
    if(!ok) return corsJson(res,401,{ok:false,error:'मोबाईल नंबर किंवा पासवर्ड चुकीचा आहे.'});
    const uid='member:'+d.id;
    if(data.uid!==uid || data.authMode!=='mobile-password') await d.ref.update({uid,authMode:'mobile-password',authVersion:4});
    const token=await admin.auth().createCustomToken(uid,{role:'member',memberId:d.id});
    const safe={id:d.id,...data,uid,authMode:'mobile-password'};
    delete safe.password; delete safe.pass; delete safe.passwordHash; delete safe.passwordSalt;
    return corsJson(res,200,{ok:true,token,member:safe,forcePasswordChange:data.forcePasswordChange===true});
  }catch(e){logger.error('memberLogin',e);return corsJson(res,500,{ok:false,error:e.message||'Login failed'});}
});

exports.memberRegister = onRequest({cors:true,maxInstances:5}, async(req,res)=>{
  try{
    if(req.method!=='POST') return corsJson(res,405,{ok:false,error:'POST required'});
    const body=req.body||{}; const mobile=cleanMobile(body.mobile||body.मोबाईल);
    if(!/^\d{10}$/.test(mobile)) return corsJson(res,400,{ok:false,error:'१० अंकी मोबाईल नंबर आवश्यक आहे.'});
    const existing=await findMemberByMobile(mobile); if(existing) return corsJson(res,409,{ok:false,error:'हा मोबाईल नंबर आधीच नोंदणीकृत आहे.'});
    const name=String(body.name||body.पूर्ण_नाव||'').trim(); if(!name) return corsJson(res,400,{ok:false,error:'नाव आवश्यक आहे.'});
    const data={...body,mobile,name,status:'Pending',स्थिती:'प्रलंबित',loginEnabled:false,isMember:true,authMode:'mobile-password',authVersion:4,registeredAt:admin.firestore.FieldValue.serverTimestamp(),createdAt:Date.now(),defaultPassword:true,forcePasswordChange:false};
    const hp=hashPassword(defaultPasswordForMember(data)); data.passwordHash=hp.hash; data.passwordSalt=hp.salt; data.passwordVersion=1; data.defaultPasswordLabel=defaultPasswordForMember(data); delete data.password; delete data.pass; delete data.emailAuth;
    const ref=await admin.firestore().collection('members').add(data);
    return corsJson(res,200,{ok:true,id:ref.id,defaultPassword:data.defaultPasswordLabel,message:'नोंदणी यशस्वी. Admin मंजुरीनंतर Login सुरू होईल.'});
  }catch(e){logger.error('memberRegister',e);return corsJson(res,500,{ok:false,error:e.message||'Registration failed'});}
});

exports.memberForgotPasswordRequest = onRequest({cors:true,maxInstances:5}, async(req,res)=>{
  try{
    if(req.method!=='POST') return corsJson(res,405,{ok:false,error:'POST required'});
    const mobile=cleanMobile(req.body?.mobile); if(!/^\d{10}$/.test(mobile)) return corsJson(res,400,{ok:false,error:'१० अंकी मोबाईल नंबर टाका.'});
    const d=await findMemberByMobile(mobile);
    // Do not expose whether an account exists, but create a request when it does.
    if(d){const x=d.data()||{};await admin.firestore().collection('password_reset_requests').add({memberId:d.id,mobile,name:x.name||x.पूर्ण_नाव||'',status:'Pending',requestedAt:Date.now(),requestType:'Member Forgot Password'});}
    return corsJson(res,200,{ok:true,message:'तुमची Password Reset Request Admin कडे पाठवली आहे. Admin नवीन password देईल.'});
  }catch(e){logger.error('memberForgotPasswordRequest',e);return corsJson(res,500,{ok:false,error:e.message||'Request failed'});}
});

exports.adminSetMemberPassword = onRequest({cors:true,maxInstances:5}, async(req,res)=>{
  try{
    if(req.method!=='POST') return corsJson(res,405,{ok:false,error:'POST required'});
    const a=await requireAdmin(req); const memberId=String(req.body?.memberId||''); let password=String(req.body?.password||'').trim();
    const ref=admin.firestore().collection('members').doc(memberId); const snap=await ref.get(); if(!snap.exists) return corsJson(res,404,{ok:false,error:'सदस्य सापडला नाही.'});
    const m=snap.data()||{}; if(!password) password=defaultPasswordForMember(m); if(password.length<6) return corsJson(res,400,{ok:false,error:'Password किमान 6 अक्षरांचा असावा.'});
    const hp=hashPassword(password); await ref.update({passwordHash:hp.hash,passwordSalt:hp.salt,passwordVersion:1,defaultPassword:password===defaultPasswordForMember(m),forcePasswordChange:false,passwordChangedAt:Date.now(),passwordChangedBy:a.name,authMode:'mobile-password'});
    await admin.firestore().collection('admin_logs').add({action:'Member password reset',memberId,name:m.name||m.पूर्ण_नाव||'',by:a.name,timestamp:Date.now()});
    if(req.body?.requestId) await admin.firestore().collection('password_reset_requests').doc(String(req.body.requestId)).update({status:'Resolved',resolvedAt:Date.now(),resolvedBy:a.name,newPasswordIssued:true}).catch(()=>{});
    return corsJson(res,200,{ok:true,password,defaultPassword:password===defaultPasswordForMember(m)});
  }catch(e){logger.error('adminSetMemberPassword',e);return corsJson(res,500,{ok:false,error:e.message||'Reset failed'});}
});

exports.memberChangePassword = onRequest({cors:true,maxInstances:5}, async(req,res)=>{
  try{
    if(req.method!=='POST') return corsJson(res,405,{ok:false,error:'POST required'});
    const u=await auth(req); if(u.role!=='member' || !u.memberId) return corsJson(res,403,{ok:false,error:'Member only'});
    const p=String(req.body?.password||'').trim(); if(p.length<6) return corsJson(res,400,{ok:false,error:'Password किमान 6 अक्षरांचा असावा.'});
    const ref=admin.firestore().collection('members').doc(u.memberId); const s=await ref.get(); if(!s.exists) return corsJson(res,404,{ok:false,error:'सदस्य सापडला नाही.'});
    const hp=hashPassword(p); await ref.update({passwordHash:hp.hash,passwordSalt:hp.salt,passwordVersion:1,defaultPassword:false,forcePasswordChange:false,passwordChangedAt:Date.now()});
    return corsJson(res,200,{ok:true});
  }catch(e){return corsJson(res,500,{ok:false,error:e.message||'Password change failed'});}
});

exports.masterSetMemberDefaultPasswords = onRequest({cors:true,maxInstances:2}, async(req,res)=>{
  try{
    if(req.method!=='POST') return corsJson(res,405,{ok:false,error:'POST required'}); const a=await requireAdmin(req); if(!a.isMaster) return corsJson(res,403,{ok:false,error:'Master Admin only'});
    if(req.body?.confirm!=='SET_DEFAULT_PASSWORDS') return corsJson(res,400,{ok:false,error:'Confirmation required'});
    const snap=await admin.firestore().collection('members').get(); let updated=0,skipped=0,errors=[];
    let batch=admin.firestore().batch(); let ops=0;
    for(const d of snap.docs){const m=d.data()||{}; if(m.isMember===false){skipped++;continue;} const p=defaultPasswordForMember(m); try{const hp=hashPassword(p); batch.update(d.ref,{passwordHash:hp.hash,passwordSalt:hp.salt,passwordVersion:1,defaultPassword:true,defaultPasswordLabel:p,passwordChangedAt:Date.now(),passwordChangedBy:a.name,authMode:'mobile-password'});updated++;ops++; if(ops===400){await batch.commit();batch=admin.firestore().batch();ops=0;}}catch(e){errors.push({id:d.id,error:e.message});}}
    if(ops) await batch.commit(); await admin.firestore().collection('admin_logs').add({action:'Master: all member default passwords reset',updated,skipped,errors:errors.length,timestamp:Date.now(),by:a.name});
    return corsJson(res,200,{ok:true,updated,created:0,reset:updated,skipped,errors});
  }catch(e){logger.error('masterSetMemberDefaultPasswords',e);return corsJson(res,500,{ok:false,error:e.message||'Bulk reset failed'});}
});

exports.masterStorageOverview = onRequest({cors:true,maxInstances:2,secrets:['CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','CLOUDINARY_CLOUD_NAME']},async(req,res)=>{
  try{const a=await requireAdmin(req);if(!a.isMaster)return corsJson(res,403,{ok:false,error:'Master Admin only'});
    const db=admin.firestore(); const collections=['members','member_files','gallery','circulars','chat_messages','admin_logs','member_logs','password_reset_requests']; const counts={}; let total=0;
    for(const c of collections){try{const s=await db.collection(c).get();counts[c]=s.size;total+=s.size;}catch(e){counts[c]=null;}}
    let authUsers=0; try{for(let token=undefined;;){const page=await admin.auth().listUsers(1000,token);authUsers+=page.users.length;if(!page.pageToken)break;token=page.pageToken;}}catch(e){authUsers=null;}
    let firebaseStorage={fileCount:0,bytes:0,available:true,bucket:null}; try{const bucket=admin.storage().bucket(); firebaseStorage.bucket=bucket.name; const [files]=await bucket.getFiles({autoPaginate:true}); firebaseStorage.fileCount=files.length; firebaseStorage.bytes=files.reduce((n,f)=>n+Number(f.metadata?.size||0),0);}catch(e){firebaseStorage={fileCount:0,bytes:0,available:false,error:e.message};}
    let cloudinary={configured:false}; try{const name=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;if(name&&key&&secret){const basic=Buffer.from(`${key}:${secret}`).toString('base64');const r=await fetch(`https://api.cloudinary.com/v1_1/${name}/usage`,{headers:{Authorization:`Basic ${basic}`}});const usage=await r.json();cloudinary={configured:r.ok,cloud_name:name,...usage};}}catch(e){cloudinary={configured:false,error:e.message};}
    return corsJson(res,200,{ok:true,generatedAt:Date.now(),firestore:{collections:counts,totalRecords:total},firebaseAuth:{userCount:authUsers},firebaseStorage,cloudinary});
  }catch(e){return corsJson(res,500,{ok:false,error:e.message||'Storage overview failed'});}
});

exports.adminPasswordResetRequests = onRequest({cors:true,maxInstances:3},async(req,res)=>{
 try{await requireAdmin(req);const s=await admin.firestore().collection('password_reset_requests').orderBy('requestedAt','desc').limit(100).get();return corsJson(res,200,{ok:true,requests:s.docs.map(d=>({id:d.id,...d.data()}))});}catch(e){return corsJson(res,500,{ok:false,error:e.message});}
});
exports.masterPasswordResetRequests = exports.adminPasswordResetRequests;


exports.cloudinaryPdfSearch = onRequest({cors:true,maxInstances:3,secrets:['CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','CLOUDINARY_CLOUD_NAME']},async(req,res)=>{
  try{
    await requireAdmin(req);
    const q=String(req.body?.q||'').trim();const max=Math.min(Math.max(Number(req.body?.max_results||100),1),500);
    const cloud=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;
    if(!cloud||!key||!secret)return corsJson(res,503,{ok:false,error:'Cloudinary API secrets configured नाहीत.'});
    let expression='resource_type:raw AND format:pdf'; if(q) expression+=` AND (public_id:*${q.replace(/[^\w\- ]/g,'')}* OR filename:*${q.replace(/[^\w\- ]/g,'')}*)`;
    const basic=Buffer.from(`${key}:${secret}`).toString('base64');const r=await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/search`,{method:'POST',headers:{Authorization:`Basic ${basic}`,'Content-Type':'application/json'},body:JSON.stringify({expression,max_results:max,with_field:'context'})});const j=await r.json();if(!r.ok)return corsJson(res,r.status,{ok:false,error:j.error?.message||'Cloudinary search failed'});
    return corsJson(res,200,{ok:true,total_count:j.total_count||0,resources:(j.resources||[]).map(x=>({public_id:x.public_id,secure_url:x.secure_url,filename:x.filename||x.public_id?.split('/').pop(),created_at:x.created_at,bytes:x.bytes,resource_type:x.resource_type,format:x.format,context:x.context||{}}))});
  }catch(e){logger.error('cloudinaryPdfSearch',e);return corsJson(res,500,{ok:false,error:e.message||'Cloudinary search failed'});}
});

exports.adminCreateSubAdmin = onRequest({cors:true,maxInstances:3},async(req,res)=>{
 try{const a=await requireAdmin(req);if(!a.isMaster)return corsJson(res,403,{ok:false,error:'Master Admin only'});if(req.method!=='POST')return corsJson(res,405,{ok:false,error:'POST required'});const b=req.body||{},name=String(b.name||'').trim(),designation=String(b.designation||'').trim(),email=String(b.email||'').trim().toLowerCase(),pass=String(b.password||'').trim();if(!name||!email||pass.length<6)return corsJson(res,400,{ok:false,error:'नाव, ई-मेल आणि किमान 6 अक्षरांचा password आवश्यक आहे.'});const existing=await admin.firestore().collection('admins').get();if(existing.docs.some(d=>String(d.data()?.email||'').trim().toLowerCase()===email))return corsJson(res,409,{ok:false,error:'हा Admin ई-मेल आधीच नोंदणीकृत आहे.'});const hp=hashPassword(pass);const ref=await admin.firestore().collection('admins').add({name,designation,email,access:b.access||'All',permissions:Array.isArray(b.permissions)?b.permissions:[],isActive:true,authMode:'admin-custom-password',passwordHash:hp.hash,passwordSalt:hp.salt,passwordVersion:1,createdAt:Date.now(),createdBy:a.name});return corsJson(res,200,{ok:true,id:ref.id});}catch(e){return corsJson(res,500,{ok:false,error:e.message});}
});

exports.adminUpdateSubAdminPassword = onRequest({cors:true,maxInstances:3},async(req,res)=>{
 try{const a=await requireAdmin(req);if(!a.isMaster)return corsJson(res,403,{ok:false,error:'Master Admin only'});const id=String(req.body?.id||''),pass=String(req.body?.password||'').trim();if(!id||pass.length<6)return corsJson(res,400,{ok:false,error:'ID आणि password आवश्यक आहे.'});const hp=hashPassword(pass);await admin.firestore().collection('admins').doc(id).update({passwordHash:hp.hash,passwordSalt:hp.salt,passwordVersion:1,pass:null,passwordChangedAt:Date.now(),passwordChangedBy:a.name,authMode:'admin-custom-password'});return corsJson(res,200,{ok:true});}catch(e){return corsJson(res,500,{ok:false,error:e.message});}
});
