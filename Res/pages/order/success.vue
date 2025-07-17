<template>
  <view class="success-container">
    <image src="/static/images/success.png" class="success-icon"></image>
    <text class="success-title">支付成功</text>
    <text class="success-desc">订单已提交，请等待取餐</text>
    
    <view class="order-info">
      <view class="info-row">
        <text>订单编号</text>
        <text>{{orderInfo.order_no}}</text>
      </view>
      <view class="info-row">
        <text>取餐码</text>
        <text class="pickup-code">{{orderInfo.pickup_code}}</text>
      </view>
      <view class="info-row">
        <text>实付金额</text>
        <text class="price">¥{{orderInfo.total_price.toFixed(2)}}</text>
      </view>
    </view>
    
    <button class="back-btn" @click="backToHome">返回首页</button>
  </view>
</template>

<script>
const db = uniCloud.database();

export default {
  data() {
    return {
      orderInfo: {}
    };
  },
  onLoad(options) {
    this.loadOrderData(options.order_id);
  },
  methods: {
    async loadOrderData(orderId) {
      const res = await db.collection('order').doc(orderId).get();
      this.orderInfo = res.result.data;
    },
    backToHome() {
      uni.switchTab({
        url: '/pages/index/index'
      });
    }
  }
};
</script>

<style>
.success-container {
  padding: 40rpx;
  text-align: center;
}
.success-icon {
  width: 120rpx;
  height: 120rpx;
  margin: 60rpx auto 30rpx;
}
.success-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}
.success-desc {
  color: #888;
  margin-bottom: 60rpx;
}
.order-info {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 40rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
  font-size: 30rpx;
}
.info-row:last-child {
  margin-bottom: 0;
}
.pickup-code {
  color: #4a90e1;
  font-weight: bold;
}
.price {
  color: #f60;
  font-weight: bold;
}
.back-btn {
  background: #4a90e1;
  color: white;
  margin-top: 40rpx;
}
</style>