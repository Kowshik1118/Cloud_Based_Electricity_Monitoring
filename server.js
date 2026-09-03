const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 5000;
const PUBLIC = path.join(__dirname, "public");
const DATA = path.join(__dirname, "data.json");

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA, "utf8")); }
  catch { return { users: [], usage: [] }; }
}
function saveData(data) { fs.writeFileSync(DATA, JSON.stringify(data, null, 2)); }
function hash(s) { return crypto.createHash("sha256").update(s).digest("hex"); }

if (!fs.existsSync(DATA)) saveData({
  users: [{id:1,name:"Admin",email:"admin@example.com",password:hash("admin123"),role:"admin"}],
  usage: []
});

function send(res, status, data, type="application/json") {
  res.writeHead(status, {"Content-Type": type});
  res.end(type === "application/json" ? JSON.stringify(data) : data);
}
function body(req) {
  return new Promise((resolve,reject)=>{
    let b="";
    req.on("data", c => b += c);
    req.on("end", ()=>{ try { resolve(b ? JSON.parse(b) : {}); } catch(e){ reject(e); }});
  });
}
function publicUser(u) {
  return {id:u.id,name:u.name,email:u.email,role:u.role};
}

const server=http.createServer(async (req,res)=>{
  const url=new URL(req.url, `http://${req.headers.host}`);
  try {
    if(req.method==="POST" && url.pathname==="/api/register"){
      const b=await body(req), d=readData();
      if(!b.name || !b.email || !b.password) return send(res,400,{error:"All fields are required"});
      if(d.users.some(u=>u.email.toLowerCase()===b.email.toLowerCase()))
        return send(res,400,{error:"Email already registered"});
      const u={id:Date.now(),name:b.name,email:b.email,password:hash(b.password),role:"user"};
      d.users.push(u); saveData(d);
      return send(res,201,{message:"Registration successful",user:publicUser(u)});
    }
    if(req.method==="POST" && url.pathname==="/api/login"){
      const b=await body(req), d=readData(), u=d.users.find(x=>x.email.toLowerCase()===String(b.email||"").toLowerCase() && x.password===hash(String(b.password||"")));
      if(!u) return send(res,401,{error:"Invalid email or password"});
      return send(res,200,{message:"Login successful",user:publicUser(u)});
    }
    if(req.method==="GET" && url.pathname==="/api/usage"){
      const d=readData();
      return send(res,200,d.usage);
    }
    if(req.method==="POST" && url.pathname==="/api/usage"){
      const b=await body(req), d=readData();
      const power=Number(b.power), hours=Number(b.hours), days=Number(b.days);
      if(!b.appliance || power<=0 || hours<=0 || days<=0) return send(res,400,{error:"Enter valid appliance and usage values"});
      const units=+(power*hours*days/1000).toFixed(2);
      const item={id:Date.now(),appliance:b.appliance,power,hours,days,units,date:b.date||new Date().toISOString().slice(0,10)};
      d.usage.push(item); saveData(d); return send(res,201,item);
    }
    if(req.method==="DELETE" && url.pathname.startsWith("/api/usage/")){
      const id=Number(url.pathname.split("/").pop()), d=readData();
      d.usage=d.usage.filter(x=>x.id!==id); saveData(d); return send(res,200,{message:"Deleted"});
    }

    let file=url.pathname==="/" ? "/index.html" : url.pathname;
    const safe=path.normalize(file).replace(/^(\.\.[\/\\])+/, "");
    const fp=path.join(PUBLIC,safe);
    if(!fp.startsWith(PUBLIC)) return send(res,403,"Forbidden","text/plain");
    fs.readFile(fp,(err,data)=>{
      if(err) return send(res,404,"Not found","text/plain");
      const ext=path.extname(fp);
      const types={".html":"text/html",".css":"text/css",".js":"application/javascript",".json":"application/json"};
      send(res,200,data,types[ext]||"application/octet-stream");
    });
  } catch(e) { console.error(e); send(res,500,{error:"Server error"}); }
});
server.listen(PORT,()=>console.log(`Electricity Monitor running at http://localhost:${PORT}`));