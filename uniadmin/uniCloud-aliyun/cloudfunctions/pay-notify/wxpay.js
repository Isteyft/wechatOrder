'use strict';
const crypto = require('crypto');
const axios = require('axios');

class WXPay {
  constructor(config) {
    this.appId = config.appId || 'wx的appid'; // 必须设置
    this.mchId = config.mchId || ''; // 微信商户号
    this.key = config.key || '';    // 微信商户API密钥
	  this.notifyUrl = 'https://云函数地址/pay-notify';
	
	if (!this.mchId || !this.key) {
	  throw new Error('微信支付配置不完整，请检查 mchId 和 key');
	}
  }

	// 签名函数修改为
	sign(params) {
	  const sortedParams = Object.keys(params)
		.filter(key => params[key] && key !== 'sign')
		.sort()
		.map(key => `${key}=${params[key]}`)
		.join('&');
	  
	  const stringSignTemp = `${sortedParams}&key=${this.key}`;
	  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
	}

  // 统一下单
  async unifiedOrder(params) {
    const baseParams = {
      appid: this.appId,
      mch_id: this.mchId,
      nonce_str: this.generateNonceStr(),
      notify_url: this.notifyUrl,
    };
    
    const finalParams = Object.assign({}, baseParams, params);
    finalParams.sign = this.sign(finalParams);
    
    const xmlData = this.buildXml(finalParams);
    const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xmlData, {
      headers: { 'Content-Type': 'text/xml' }
    });
    
    return this.parseXml(response.data);
  }

  // 生成随机字符串
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 构建XML
  buildXml(params) {
    let xml = '<xml>';
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        xml += `<${key}>${params[key]}</${key}>`;
      }
    }
    xml += '</xml>';
    return xml;
  }

  // 解析XML
  parseXml(xml) {
    const regex = /<([a-zA-Z]+)>([^<]+)<\/\1>/g;
    const result = {};
    let match;
    while ((match = regex.exec(xml))) {
      result[match[1]] = match[2];
    }
    return result;
  }
}

module.exports = WXPay;