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

// ==========================================================
// MEMBER PASSWORD ADMIN CONTROLS
// - Individual default/custom password reset
// - Bulk default reset skips members whose email is properly
//   updated and Firebase-verified.
// ==========================================================
async function requireAdmin(req) {
  const u = await auth(req);
  const email = String(u.email || '').trim().toLowerCase();
  if (email === 'hangemahesh498@gmail.com') return u;

  const snap = await admin.firestore().collection('admins').get();
  const d = snap.docs.find(x => String(x.data()?.email || '').trim().toLowerCase() === email);
  if (!d) throw new Error('Admin access required');
  const a = d.data() || {};
  if (a.isActive === false) throw new Error('Admin account is disabled');
  const perms = Array.isArray(a.permissions) ? a.permissions : [];
  if (!(perms.includes('members') || perms.includes('member_approve') || perms.includes('member_edit'))) {
    throw new Error('Member management permission required');
  }
  return u;
}

function memberEmailIsPlaceholder(email, data) {
  const e = String(email || '').trim().toLowerCase();
  return !e || e === '1234@gmail.com' || data?.isDefaultEmail === true || e.endsWith('@xrayunion.local');
}

async function getMemberAuthRecord(memberId, data) {
  let user = null;
  if (data?.uid) {
    try { user = await admin.auth().getUser(String(data.uid)); } catch (_) {}
  }
  if (!user) {
    const email = String(data?.email || '').trim().toLowerCase();
    if (email && !memberEmailIsPlaceholder(email, data)) {
      try { user = await admin.auth().getUserByEmail(email); } catch (_) {}
    }
  }
  return user;
}

exports.adminSetMemberPassword = onRequest({cors:true}, async (req,res) => {
  if (req.method !== 'POST') return res.status(405).json({ok:false,error:'POST required'});
  try {
    await requireAdmin(req);
    const memberId = String(req.body?.memberId || '').trim();
    const password = String(req.body?.password || '');
    const forcePasswordChange = req.body?.forcePasswordChange === true;
    if (!memberId) return res.status(400).json({ok:false,error:'memberId required'});
    if (password.length < 6) return res.status(400).json({ok:false,error:'Password must be at least 6 characters'});

    const ref = admin.firestore().collection('members').doc(memberId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ok:false,error:'Member not found'});
    const data = snap.data() || {};

    let user = await getMemberAuthRecord(memberId, data);
    const rawEmail = String(data.email || '').trim().toLowerCase();
    const authEmail = (!memberEmailIsPlaceholder(rawEmail, data))
      ? rawEmail
      : `member-${memberId}@xrayunion.local`;

    if (!user) {
      user = await admin.auth().createUser({email: authEmail, password, emailVerified: false, disabled: data.loginEnabled === false});
    } else {
      user = await admin.auth().updateUser(user.uid, {password, disabled: data.loginEnabled === false});
    }

    await ref.update({
      uid: user.uid,
      authEmail: user.email || authEmail,
      defaultPasswordEnabled: forcePasswordChange,
      forcePasswordChange: forcePasswordChange,
      passwordChangedAt: forcePasswordChange ? null : Date.now(),
      password: null,
      pass: null,
      updatedAt: Date.now()
    });
    return res.json({ok:true,uid:user.uid,email:user.email,forcePasswordChange});
  } catch (e) {
    logger.error('adminSetMemberPassword', e);
    return res.status(403).json({ok:false,error:e.message || String(e)});
  }
});

exports.masterSetMemberDefaultPasswords = onRequest({cors:true}, async (req,res) => {
  if (req.method !== 'POST') return res.status(405).json({ok:false,error:'POST required'});
  try {
    const u = await auth(req);
    if (String(u.email || '').trim().toLowerCase() !== 'hangemahesh498@gmail.com') {
      return res.status(403).json({ok:false,error:'Master Admin only'});
    }
    if (req.body?.confirm !== 'SET_DEFAULT_PASSWORDS') {
      return res.status(400).json({ok:false,error:'Confirmation required'});
    }

    const snap = await admin.firestore().collection('members').get();
    let updated=0, created=0, reset=0, skipped=0, skippedVerifiedEmail=0;
    const errors=[];

    for (const doc of snap.docs) {
      const m = doc.data() || {};
      if (m.isMember === false) { skipped++; continue; }

      const statusRaw=String(m.status || m.स्थिती || '').trim().toLowerCase();
      const approved = ['approved','मंजूर','मान्य'].includes(statusRaw);
      if (!approved || m.loginEnabled === false) { skipped++; continue; }

      let user = await getMemberAuthRecord(doc.id, m);
      const rawEmail=String(m.email || '').trim().toLowerCase();

      // IMPORTANT: Do not touch members who have a real, Firebase-verified email.
      if (user && !memberEmailIsPlaceholder(rawEmail,m) && user.emailVerified === true) {
        skippedVerifiedEmail++;
        continue;
      }

      try {
        const authEmail = (!memberEmailIsPlaceholder(rawEmail,m))
          ? rawEmail
          : `member-${doc.id}@xrayunion.local`;

        if (!user) {
          user = await admin.auth().createUser({email:authEmail,password:'Pass@123',emailVerified:false,disabled:false});
          created++;
        } else {
          user = await admin.auth().updateUser(user.uid,{password:'Pass@123',disabled:false});
          reset++;
        }

        await doc.ref.update({
          uid:user.uid,
          authEmail:user.email || authEmail,
          defaultPasswordEnabled:true,
          forcePasswordChange:true,
          password:null,
          pass:null,
          passwordChangedAt:null,
          defaultPasswordSetAt:Date.now(),
          defaultPasswordSetBy:u.uid
        });
        updated++;
      } catch(e) {
        errors.push({memberId:doc.id,name:m.name || m.पूर्ण_नाव || '',error:e.message || String(e)});
      }
    }

    return res.json({ok:true,updated,created,reset,skipped,skippedVerifiedEmail,errors});
  } catch(e) {
    logger.error('masterSetMemberDefaultPasswords',e);
    return res.status(500).json({ok:false,error:e.message || String(e)});
  }
});


exports.masterStorageOverview = onRequest({secrets:["CLOUDINARY_API_KEY","CLOUDINARY_API_SECRET","CLOUDINARY_CLOUD_NAME"],cors:true},async(req,res)=>{
 try{const u=await auth(req);if(u.email!=="hangemahesh498@gmail.com")return res.status(403).json({ok:false,error:"Master Admin only"});
 const basic=Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString("base64");
 const r=await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/usage`,{headers:{Authorization:`Basic ${basic}`}});res.status(r.status).json(await r.json());
 }catch(e){res.status(500).json({ok:false,error:e.message})}
});

exports.masterCleanup = onRequest({cors:true},async(req,res)=>{
 try{const u=await auth(req);if(u.email!=="hangemahesh498@gmail.com")return res.status(403).json({ok:false,error:"Master Admin only"});if(req.method!=="POST"||req.body?.confirm!=="CONFIRM")return res.status(400).json({ok:false,error:"CONFIRM required"});
 const cutoff=Date.now()-120*24*60*60*1000,s=await admin.firestore().collection("admin_logs").where("timestamp","<",cutoff).get(),b=admin.firestore().batch();s.docs.forEach(x=>b.delete(x.ref));await b.commit();await admin.firestore().collection("admin_logs").add({action:"MASTER CLEANUP",deletedLogs:s.size,timestamp:Date.now(),uid:u.uid});res.json({ok:true,deletedLogs:s.size});
 }catch(e){res.status(500).json({ok:false,error:e.message})}
});
