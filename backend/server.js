
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(cors({origin:"*"}));
app.use(express.json({limit:"10mb"}));

const DATA_FILE = path.join(__dirname, "pool_data.json");
let memoryPool = null;

function loadPool(){
  try{
    if(fs.existsSync(DATA_FILE)){
      const d = JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
      if(Array.isArray(d) && d.length>0) return d;
    }
  }catch(e){}
  // 默认12组
  return [[5,12,23,34,45,56,67,78],[2,14,26,33,48,59,61,73],[8,19,27,36,44,52,66,80],[11,22,31,40,50,63,72,77],[4,17,28,39,47,58,69,74],[1,15,24,35,46,55,68,79],[6,18,29,37,43,54,62,71],[9,20,32,41,49,60,65,75],[3,13,25,38,42,53,64,70],[10,16,30,46,51,57,76,80],[7,21,33,44,48,59,66,73],[12,24,35,46,57,68,79,80]];
}
function savePool(pool){
  memoryPool = pool;
  try{ fs.writeFileSync(DATA_FILE, JSON.stringify(pool)); }catch(e){ console.error("Save file fail", e.message); }
}

app.get("/api/pool", (req,res)=>{
  const pool = memoryPool || loadPool();
  res.json({ok:true, count: pool.length, pool: pool});
});

app.post("/api/pool/save", (req,res)=>{
  let pool = req.body.pool;
  if(!pool) return res.json({ok:false, msg:"no pool"});
  // 兼容对象格式和数组格式
  if(pool[0] && pool[0].numbers) pool = pool.map(p=>p.numbers);
  if(!Array.isArray(pool) || pool.length===0) return res.json({ok:false, msg:"empty"});
  savePool(pool);
  console.log("Pool saved:", pool.length);
  res.json({ok:true, count: pool.length});
});

app.get("/", (req,res)=> res.send("KL8 Neuro Backend Live - Pool API: /api/pool"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log("Backend live on", PORT));
