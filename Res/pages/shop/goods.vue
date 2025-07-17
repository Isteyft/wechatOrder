<template>
  <view class="detail-container">
    <!-- 商品图片轮播 -->
    <swiper class="product-swiper" autoplay circular>
      <swiper-item v-for="(img, index) in product.images" :key="index">
        <image :src="img" mode="aspectFill" class="swiper-image"></image>
      </swiper-item>
    </swiper>

    <!-- 商品基本信息 -->
    <view class="product-base">
      <text class="product-name">{{product.name}}</text>
      <text class="product-desc">{{product.description}}</text>
      <view class="price-section">
        <text class="current-price">¥{{product.price.toFixed(2)}}</text>
        <text class="original-price" v-if="product.originalPrice">¥{{product.originalPrice.toFixed(2)}}</text>
        <text class="sold-count">已售{{product.soldCount}}份</text>
      </view>
    </view>

    <!-- 商品规格 -->
    <view class="spec-section">
      <view class="section-title">规格</view>
      <view class="spec-list">
        <view 
          v-for="(spec, index) in product.specs" 
          :key="index"
          :class="['spec-item', activeSpec === index ? 'active' : '']"
          @click="selectSpec(index)"
        >
          {{spec}}
        </view>
      </view>
    </view>

    <!-- 商品详情 -->
    <view class="detail-section">
      <view class="section-title">商品详情</view>
      <rich-text :nodes="product.detail"></rich-text>
    </view>

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <view class="action-icons">
        <view class="action-icon">
          <uni-icons type="home" size="24" color="#666"></uni-icons>
          <text>首页</text>
        </view>
        <view class="action-icon">
          <uni-icons type="star" size="24" color="#666"></uni-icons>
          <text>收藏</text>
        </view>
        <view class="action-icon">
          <uni-badge :text="cartCount" type="error" absolute="rightTop" offset="5,5">
            <uni-icons type="cart" size="24" color="#666"></uni-icons>
          </uni-badge>
          <text>购物车</text>
        </view>
      </view>
      <view class="action-buttons">
        <button class="add-cart" @click="addToCart">加入购物车</button>
        <button class="buy-now" @click="buyNow">立即购买</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activeSpec: 0,
      product: {
        id: 101,
        name: '巨无霸汉堡套餐',
        description: '经典巨无霸汉堡+薯条+可乐',
        price: 38,
        originalPrice: 42,
        soldCount: 256,
        images: [
          '/static/products/burger-combo-1.jpg',
          '/static/products/burger-combo-2.jpg'
        ],
        specs: ['标准', '大份', '超大份'],
        detail: `
          <p>【套餐内容】</p>
          <p>巨无霸汉堡1个+薯条(中)1份+可乐(中)1杯</p>
          <p><img src="/static/products/detail-1.jpg"/></p>
          <p>【美味说明】</p>
          <p>经典巨无霸汉堡，双层牛肉饼配特制酱料</p>
        `
      }
    }
  },
  computed: {
    cartCount() {
      const cart = uni.getStorageSync('cart') || {}
      return Object.values(cart).reduce((sum, count) => sum + count, 0)
    }
  },
  methods: {
    selectSpec(index) {
      this.activeSpec = index
    },
    addToCart() {
      const cart = uni.getStorageSync('cart') || {}
      const productId = this.product.id
      cart[productId] = (cart[productId] || 0) + 1
      uni.setStorageSync('cart', cart)
      
      uni.showToast({
        title: '已加入购物车',
        icon: 'success'
      })
    },
    buyNow() {
      this.addToCart()
      uni.switchTab({
        url: '/pages/cart/cart'
      })
    }
  }
}
</script>

<style scoped>
.detail-container {
  padding-bottom: 100rpx;
}

.product-swiper {
  height: 500rpx;
}

.swiper-image {
  width: 100%;
  height: 100%;
}

.product-base {
  padding: 30rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
}

.product-name {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 15rpx;
}

.product-desc {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 20rpx;
}

.price-section {
  display: flex;
  align-items: center;
}

.current-price {
  font-size: 40rpx;
  color: #FF5A5F;
  font-weight: bold;
  margin-right: 20rpx;
}

.original-price {
  font-size: 28rpx;
  color: #999;
  text-decoration: line-through;
  margin-right: 20rpx;
}

.sold-count {
  font-size: 24rpx;
  color: #999;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.spec-section {
  background-color: #fff;
  margin-bottom: 20rpx;
}

.spec-list {
  padding: 20rpx 30rpx;
  display: flex;
}

.spec-item {
  padding: 10rpx 30rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  margin-right: 20rpx;
  font-size: 28rpx;
}

.spec-item.active {
  border-color: #FF5A5F;
  color: #FF5A5F;
}

.detail-section {
  background-color: #fff;
  padding: 20rpx 30rpx;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: #fff;
  display: flex;
  align-items: center;
  border-top: 1rpx solid #f5f5f5;
}

.action-icons {
  flex: 1;
  display: flex;
  justify-content: space-around;
}

.action-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 20rpx;
  color: #666;
  position: relative;
}

.action-buttons {
  display: flex;
}

.add-cart {
  width: 200rpx;
  height: 80rpx;
  background-color: #FF9500;
  color: #fff;
  border-radius: 0;
  font-size: 28rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.buy-now {
  width: 200rpx;
  height: 80rpx;
  background-color: #FF5A5F;
  color: #fff;
  border-radius: 0;
  font-size: 28rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>