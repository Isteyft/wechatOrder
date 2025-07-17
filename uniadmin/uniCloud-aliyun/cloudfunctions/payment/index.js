'use strict';
exports.main = async (event, context) => {
	//event为客户端上传的参数
	console.log('event : ', event)
	
	//返回数据给客户端
	return event
};
'use strict';
const WXPay = require('./wxpay');
const db = uniCloud.database();

exports.main = async (event, context) => {
  const { action, order_id, payment_method } = event;
  
   // 添加基本参数验证
  if (!action || !order_id) {
	return { 
	  code: 400, 
	  message: '缺少必要参数: action 和 order_id 是必填项' 
	};
  }
  
  try {
    switch (action) {
      case 'create':
        return await createPayment(order_id, payment_method);
      case 'query':
        return await queryPayment(order_id);
      default:
        return { code: 400, message: '无效的操作类型' };
    }
  } catch (e) {
    console.error('支付处理错误:', e);
	return { 
	  code: 500, 
	  message: '支付处理失败',
	  error: e.message,
	  stack: e.stack 
	};
  }
};

// 创建支付订单
async function createPayment(orderId, paymentMethod) {
  try {
    console.log('开始创建支付订单:', orderId);
    
    // 1. 验证订单
    const orderRes = await db.collection('order').doc(orderId).get();
    console.log('订单查询结果:', orderRes);
    
    if (!orderRes.data || orderRes.data.length === 0) {
      throw new Error('订单不存在');
    }
    
    const order = orderRes.data[0];
    console.log('订单详情:', order);
    
    // 2. 获取用户openid（小程序支付必需）
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    if (!openid) {
      throw new Error('获取用户openid失败');
    }

    // 3. 初始化支付配置
    const wxpay = new WXPay({
      appId: wxContext.APPID,
      mchId: '', // 已在WXPay类中配置
      key: '',   // 已在WXPay类中配置
      notifyUrl: '' // 已在WXPay类中配置
    });

    // 4. 准备支付参数
    const params = {
      body: `订单支付-${order.order_no}`,
      out_trade_no: order.order_no,
      total_fee: Math.round(order.total_price * 100), // 转为分
      spbill_create_ip: '127.0.0.1', // 可简化
      trade_type: 'JSAPI',
      openid: openid // 必须设置
    };
    
    console.log('支付参数:', params);

    // 5. 调用微信支付接口
    const result = await wxpay.unifiedOrder(params);
    console.log('微信支付返回:', result);
    
    if (result.return_code !== 'SUCCESS') {
      throw new Error(result.return_msg || '微信支付接口调用失败');
    }
    
    // 6. 生成客户端支付参数
    const paymentParams = {
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: result.nonce_str,
      package: `prepay_id=${result.prepay_id}`,
      signType: 'MD5',
      paySign: wxpay.sign({
        appId: wxContext.APPID,
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: result.nonce_str,
        package: `prepay_id=${result.prepay_id}`,
        signType: 'MD5'
      })
    };
    
    console.log('生成的支付参数:', paymentParams);
    
    return {
      code: 200,
      message: '创建支付成功',
      data: { paymentParams, order_id: orderId }
    };
    
  } catch (e) {
    console.error('创建支付订单失败:', e);
    throw e; // 继续抛出错误由上层处理
  }
}

// 查询支付状态
async function queryPayment(orderId) {
  const orderRes = await db.collection('order').doc(orderId).get();
  if (!orderRes.data || orderRes.data.length === 0) {
    return { code: 404, message: '订单不存在' };
  }
  
  return {
    code: 200,
    data: {
      status: orderRes.data[0].status,
      payment_method: orderRes.data[0].payment_method
    }
  };
}