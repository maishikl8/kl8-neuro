
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const POOL_FILE = path.join(__dirname, 'pool.json');
const LICENSE_FILE = path.join(__dirname, 'licenses.json');

const DEFAULT_POOL = [
  [5,12,23,34,45,56,67,78],
  [2,14,26,33,48,59,61,73],
  [8,19,27,36,44,52,66,80],
  [11,22,31,40,50,63,72,77],
  [4,17,28,39,47,58,69,74],
  [1,15,24,35,46,55,68,79],
  [6,18,29,37,43,54,62,71],
  [9,20,32,41,49,60,65,75],
  [3,13,25,38,42,53,64,70],
  [10,16,30,46,51,57,76,80],
  [7,21,33,44,48,59,66,73],
  [12,24,35,46,57,68,79,80]
];

let GLOBAL_POOL = null;
let LICENSES = {};

function loadData(){
  try{
    if(fs.existsSync(POOL_FILE)){
      GLOBAL_POOL = JSON.parse(fs.readFileSync(POOL_FILE,'utf8'));
      console.log('[LOAD] Pool', GLOBAL_POOL.length);
    }else GLOBAL_POOL = DEFAULT_POOL;
  }catch(e){ GLOBAL_POOL = DEFAULT_POOL; }
  try{
    if(fs.existsSync(LICENSE_FILE)) LICENSES = JSON.parse(fs.readFileSync(LICENSE_FILE,'utf8'));
  }catch(e){ LICENSES = {}; }
}
function savePool(){ try{ fs.writeFileSync(POOL_FILE, JSON.stringify(GLOBAL_POOL)); }catch(e){} }
function saveLicenses(){ try{ fs.writeFileSync(LICENSE_FILE, JSON.stringify(LICENSES)); }catch(e){} }
loadData();

app.get('/', (req,res)=>res.json({ok:true, msg:'KL8 Backend V2 Running', poolCount:GLOBAL_POOL.length, endpoints:['/api/pool','/api/pool/save']}));
app.get('/api/pool', (req,res)=>res.json({ok:true, pool:GLOBAL_POOL, count:GLOBAL_POOL.length}));

app.post('/api/pool/save', (req,res)=>{
  console.log('[SAVE] body keys', Object.keys(req.body));
  let pool = req.body.pool;
  if(!pool && req.body.data) pool = req.body.data; //兼容
  if(!Array.isArray(pool) || pool.length===0){
    console.log('[SAVE] invalid pool', typeof pool);
    return res.status(400).json({ok:false, msg:'pool空或格式错误'});
  }
  // 清洗数据：确保都是数字数组
  const cleaned = [];
  for(let row of pool){
    if(!Array.isArray(row)) continue;
    const nums = row.map(n=>parseInt(n)).filter(n=>!isNaN(n) && n>=1 && n<=80).slice(0,8);
    if(nums.length===8) cleaned.push(nums);
  }
  if(cleaned.length===0) return res.status(400).json({ok:false, msg:'清洗后0组，检查格式'});
  GLOBAL_POOL = cleaned;
  savePool();
  console.log(`[ADMIN] Pool saved ${cleaned.length} groups`);
  res.json({ok:true, count:cleaned.length});
});

const USDT_ADDRESS = "TEPYpqXqXbEPKx4nSYWDJQ8idaBxiNG4jh";
app.post('/api/payment/verify', async (req,res)=>{
  const {txHash} = req.body;
  if(!txHash || txHash.length<10) return res.json({ok:false, msg:'哈希无效'});
  const licenseKey = 'KL8-' + Math.random().toString(36).substring(2,8).toUpperCase() + '-' + Date.now().toString().slice(-6);
  LICENSES[licenseKey] = {count:10, used:0, createdAt:new Date().toISOString(), txHash};
  saveLicenses();
  res.json({ok:true, licenseKey, count:10});
});
app.post('/api/license/verify', (req,res)=>{
  const {licenseKey} = req.body;
  const lic = LICENSES[licenseKey];
  if(!lic) return res.json({ok:false, msg:'授权码不存在'});
  if(lic.used >= lic.count) return res.json({ok:false, msg:'次数用完'});
  lic.used++; saveLicenses();
  res.json({ok:true, remaining: lic.count-lic.used, pool:GLOBAL_POOL});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log(`KL8 V2 running ${PORT} pool ${GLOBAL_POOL.length}`));
