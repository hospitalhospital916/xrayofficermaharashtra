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
