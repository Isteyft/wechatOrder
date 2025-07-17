'use strict';
const WXPay = require('./wxpay');
const db = uniCloud.database();

exports.main = async (event) => {
  try {
    const wxpay = new WXPay({
      appId: 'your_appid',
      mchId: 'your_mchid',
      key: 'your_key'
    });
    
    const result = wxpay.parseXml(event.body);
    
    // 更新订单状态
    await db.collection('order')
      .where({ order_no: result.out_trade_no })
      .update({
        status: '已支付',
        wx_transaction_id: result.transaction_id,
        pay_time: db.serverDate()
      });
      
    return { return_code: 'SUCCESS' };
    
  } catch (e) {
    console.error('支付通知处理失败:', e);
    return { return_code: 'FAIL', return_msg: e.message };
  }
};