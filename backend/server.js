
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// ===== 中间件 =====
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== 持久化文件路径 =====
const POOL_FILE = path.join(__dirname, 'pool.json');
const LICENSE_FILE = path.join(__dirname, 'licenses.json');

// ===== 默认初选池 12组 =====
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

// 加载持久化数据
function loadData(){
  try{
    if(fs.existsSync(POOL_FILE)){
      GLOBAL_POOL = JSON.parse(fs.readFileSync(POOL_FILE,'utf8'));
      console.log('[LOAD] Pool loaded:', GLOBAL_POOL.length);
    }else{
      GLOBAL_POOL = DEFAULT_POOL;
    }
  }catch(e){
    console.log('[LOAD] Pool load fail, use default', e.message);
    GLOBAL_POOL = DEFAULT_POOL;
  }
  try{
    if(fs.existsSync(LICENSE_FILE)){
      LICENSES = JSON.parse(fs.readFileSync(LICENSE_FILE,'utf8'));
    }
  }catch(e){
    LICENSES = {};
  }
}
function savePool(){
  try{ fs.writeFileSync(POOL_FILE, JSON.stringify(GLOBAL_POOL, null, 2)); }catch(e){ console.log('save pool fail', e.message); }
}
function saveLicenses(){
  try{ fs.writeFileSync(LICENSE_FILE, JSON.stringify(LICENSES, null, 2)); }catch(e){}
}
loadData();

// ===== 基础路由 =====
app.get('/', (req, res) => {
  res.json({ok:true, msg:'KL8 NEURO Backend Running', poolCount: GLOBAL_POOL?.length||0, time: new Date().toISOString()});
});

// ===== B方案核心：初选池接口 =====
app.get('/api/pool', (req, res) => {
  res.json({ok:true, pool: GLOBAL_POOL, count: GLOBAL_POOL.length, updatedAt: new Date().toISOString()});
});

app.post('/api/pool/save', (req, res) => {
  const {pool, adminKey} = req.body;
  if(!Array.isArray(pool) || pool.length===0){
    return res.json({ok:false, msg:'pool数据为空'});
  }
  if(pool.length>5000){
    return res.json({ok:false, msg:'最多支持5000组，当前'+pool.length});
  }
  // 简单校验每组8个数字
  for(let i=0;i<pool.length;i++){
    if(!Array.isArray(pool[i]) || pool[i].length<8){
      return res.json({ok:false, msg:`第${i+1}组不足8个号码`});
    }
  }
  GLOBAL_POOL = pool;
  savePool();
  console.log(`[ADMIN] Pool updated to ${pool.length} groups`);
  res.json({ok:true, count: pool.length, msg:'同步成功'});
});

// ===== 支付验证 (你原来的) =====
const USDT_ADDRESS = "TEPYpqXqXbEPKx4nSYWDJQ8idaBxiNG4jh";
app.post('/api/payment/verify', async (req, res) => {
  const {txHash} = req.body;
  if(!txHash || txHash.length<20){
    return res.json({ok:false, msg:'交易哈希无效'});
  }
  // TODO: 这里可以接 TronGrid API 真实验证，目前为演示版
  // 真实验证示例：
  // const tronRes = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}`);
  // 校验 to_address == USDT_ADDRESS && amount == 10*1e6

  // 演示：任何哈希都通过，并生成授权码
  const licenseKey = 'KL8-' + Math.random().toString(36).substring(2,8).toUpperCase() + '-' + Date.now().toString().slice(-6);
  LICENSES[licenseKey] = {
    count: 10,
    used: 0,
    createdAt: new Date().toISOString(),
    txHash: txHash
  };
  saveLicenses();
  console.log('[PAY] New license', licenseKey, 'for', txHash);
  res.json({ok:true, licenseKey: licenseKey, count:10, msg:'支付验证成功'});
});

// ===== 授权码验证 =====
app.post('/api/license/verify', (req, res) => {
  const {licenseKey} = req.body;
  const lic = LICENSES[licenseKey];
  if(!lic){
    return res.json({ok:false, msg:'授权码不存在'});
  }
  if(lic.used >= lic.count){
    return res.json({ok:false, msg:'次数已用完'});
  }
  lic.used++;
  saveLicenses();
  res.json({ok:true, remaining: lic.count - lic.used, pool: GLOBAL_POOL});
});

app.get('/api/license/list', (req, res) => {
  res.json({ok:true, licenses: LICENSES});
});

// ===== 启动 =====
app.listen(PORT, () => {
  console.log(`KL8 Backend running on ${PORT}, Pool: ${GLOBAL_POOL.length} groups`);
});
