// One serverless function: create / join / get / move / resign.
// All rules and validation happen here; the browser only draws the board.
const crypto=require("crypto");
const E=require("../lib/chess");
const URL_=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
const TOKEN=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
const TTL=60*60*24*7; // games expire after 7 days

async function redis(cmd){
  const r=await fetch(URL_,{method:"POST",headers:{Authorization:"Bearer "+TOKEN},body:JSON.stringify(cmd)});
  const j=await r.json();
  if(j.error)throw new Error(j.error);
  return j.result;
}
const rnd=n=>crypto.randomBytes(n).toString("hex");
const load=async id=>{
  if(!/^[a-f0-9]{8}$/.test(id||""))return null;
  const r=await redis(["GET","chess:"+id]);
  return r?JSON.parse(r):null;
};
const save=g=>redis(["SET","chess:"+g.id,JSON.stringify(g),"EX",TTL]);

function view(g,tok){
  const color=tok&&tok===g.wt?"w":tok&&tok===g.bt?"b":null,s=g.s;
  return{
    id:g.id,v:g.v,color,joined:!!g.bt,res:g.res,
    s:{b:s.b,t:s.t,cap:s.cap,last:s.last},
    check:E.inCheck(s.b,s.t),
    legal:color&&color===s.t&&!g.res&&g.bt?E.allLegal(s):{}
  };
}
const bad=(res,msg,code=400)=>res.status(code).json({error:msg});
const sq=x=>Array.isArray(x)&&x.length===2&&x.every(n=>Number.isInteger(n)&&n>=0&&n<8);

module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(!URL_||!TOKEN)return bad(res,"Redis is not connected. Add the Upstash Redis integration to this Vercel project, then redeploy.",500);
  try{
    const post=req.method==="POST";
    let b=post?req.body:req.query;
    if(typeof b==="string")b=JSON.parse(b);
    b=b||{};
    const a=post?b.action:"get";
    if(a==="create"){
      const g={id:rnd(4),v:1,s:E.init(),wt:rnd(16),bt:null,res:null};
      await save(g);
      return res.json({...view(g,g.wt),token:g.wt});
    }
    const g=await load(b.id);
    if(!g)return bad(res,"Game not found or expired.",404);
    const tok=b.token||"";
    const color=tok&&tok===g.wt?"w":tok&&tok===g.bt?"b":null;

    if(a==="get"){
      if(String(g.v)===String(b.v))return res.json({same:true});
      return res.json(view(g,tok));
    }
    if(a==="join"){
      if(g.bt||color)return res.json(view(g,tok));
      g.bt=rnd(16);g.v++;
      await save(g);
      return res.json({...view(g,g.bt),token:g.bt});
    }
    if(a==="move"){
      if(!color||!g.bt||g.res||g.s.t!==color)return bad(res,"It is not your turn.");
      if(!sq(b.from)||!sq(b.to))return bad(res,"Invalid move.");
      const p=g.s.b[b.from[0]][b.from[1]];
      if(!p||p[0]!==color)return bad(res,"Invalid move.");
      const m=E.legal(g.s,b.from[0],b.from[1]).find(x=>x[0]===b.to[0]&&x[1]===b.to[1]);
      if(!m)return bad(res,"Illegal move.");
      g.s=E.apply(g.s,b.from,m,["Q","R","B","N"].includes(b.promo)?b.promo:"Q");
      if(!Object.keys(E.allLegal(g.s)).length)
        g.res=E.inCheck(g.s.b,g.s.t)?{type:"mate",winner:color}:{type:"draw"};
      g.v++;
      await save(g);
      return res.json(view(g,tok));
    }
    if(a==="resign"){
      if(!color||!g.bt||g.res)return bad(res,"Cannot resign now.");
      g.res={type:"resign",winner:color==="w"?"b":"w"};g.v++;
      await save(g);
      return res.json(view(g,tok));
    }
    return bad(res,"Unknown action.");
  }catch(e){
    return bad(res,"Server error: "+e.message,500);
  }
};
