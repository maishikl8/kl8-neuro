import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const RECEIVE_ADDRESS = "TEPYpqXqXbEPKx4nSYWDJQ8idaBxiNG4jh";
const PAY_AMOUNT = 10;
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

const db = {};

app.get('/', (req,res)=> res.json({status:'ok', message:'kl8-neuro backend is live', receive: RECEIVE_ADDRESS}));
app.get('/api/health', (req,res)=> res.json({ok:true}));

app.post('/api/payment/create', (req,res)=>{
  const orderId = 'KL8-' + Math.random().toString(36).substring(2,8).toUpperCase() + '-' + Date.now().toString().slice(-4);
  res.json({
    orderId,
    amount: PAY_AMOUNT,
    address: RECEIVE_ADDRESS,
    network: 'TRC20',
    qrContent: RECEIVE_ADDRESS
  });
});

app.post('/api/payment/verify', async (req,res)=>{
  const { txHash, clientId } = req.body;
  if(!txHash) return res.json({ok:false, msg:'请输入交易哈希 TxHash'});
  try {
    const r = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${txHash}`);
    const data = await r.json();
    
    const isSuccess = data.contractRet === 'SUCCESS';
    const toAddress = data.tokenTransferInfo?.to_address || data.toAddress;
    const amount = data.tokenTransferInfo?.amount_str ? parseInt(data.tokenTransferInfo.amount_str)/1e6 : 0;
    const contractAddr = data.tokenTransferInfo?.contract_address;
    
    if(!isSuccess) return res.json({ok:false, msg:'交易未成功'});
    if(toAddress !== RECEIVE_ADDRESS) return res.json({ok:false, msg:`收款地址不对，应为 ${RECEIVE_ADDRESS}`});
    if(contractAddr !== USDT_CONTRACT) return res.json({ok:false, msg:'不是USDT交易'});
    if(amount < PAY_AMOUNT - 0.1) return res.json({ok:false, msg:`金额不足，需 ${PAY_AMOUNT} USDT，实际 ${amount}`});
    
    if(db[txHash]) return res.json({ok:false, msg:'该交易已使用过'});
    
    const fromAddress = data.tokenTransferInfo?.from_address || data.ownerAddress || clientId || 'unknown';
    const licenseKey = 'KL8-' + Math.random().toString(36).substring(2,6).toUpperCase() + '-' + Math.random().toString(36).substring(2,6).toUpperCase();
    
    db[licenseKey] = {
      remaining: 10,
      fromAddress,
      txHash,
      orderAmount: amount,
      createdAt: new Date().toISOString()
    };
    db[txHash] = true;
    
    res.json({ok:true, licenseKey, remaining:10, fromAddress});
  } catch(e) {
    res.json({ok:false, msg:'链上查询失败：' + e.message});
  }
});

app.post('/api/license/check', (req,res)=>{
  const { licenseKey } = req.body;
  if(!licenseKey || !db[licenseKey]) return res.json({ok:false, msg:'授权码无效'});
  res.json({ok:true, ...db[licenseKey]});
});

app.post('/api/license/use', (req,res)=>{
  const { licenseKey } = req.body;
  if(!db[licenseKey]) return res.json({ok:false, msg:'授权码无效'});
  if(db[licenseKey].remaining <= 0) return res.json({ok:false, msg:'次数已用完，请续费'});
  db[licenseKey].remaining -= 1;
  res.json({ok:true, remaining: db[licenseKey].remaining});
});

app.listen(10000, ()=> console.log('Server running on port 10000, receive:', RECEIVE_ADDRESS));
