'use strict';
const db = uniCloud.database();
const orderCollection = db.collection('order');

exports.main = async (event, context) => {
  // 生成订单号逻辑
  const generateOrderNo = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `ORD${year}${month}${day}${hours}${minutes}${seconds}${randomNum}`;
  };

  // 检查订单号是否已存在
  let orderNo;
  let exists;
  do {
    orderNo = generateOrderNo();
    const res = await orderCollection.where({
      order_no: orderNo
    }).count();
    exists = res.total > 0;
  } while (exists);

  return {
    code: 200,
    message: '订单号生成成功',
    data: {
      order_no: orderNo
    }
  };
};