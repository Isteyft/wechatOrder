<template>
  <view class="checkout-container">
    <!-- 桌号信息 -->
    <view class="table-section">
      <text class="table-label">桌号：</text>
      <text class="table-number">{{tableNumber}}</text>
    </view>
    
    <!-- 商品列表 -->
    <scroll-view scroll-y class="goods-list">
      <view class="section-title">商品清单</view>
      <view 
        v-for="(count, id) in cartItems" 
        :key="id"
        class="goods-item"
      >
        <image :src="getProductImage(id)" class="goods-image"></image>
        <view class="goods-info">
          <view class="goods-name">{{getProductName(id)}}</view>
          <view class="goods-spec" v-if="getSpecsText(id)">{{getSpecsText(id)}}</view>
        </view>
        <view class="goods-right">
          <text class="goods-price">¥{{getItemPrice(id).toFixed(2)}}</text>
          <text class="goods-count">x{{count}}</text>
        </view>
      </view>
    </scroll-view>
    
    <!-- 备注信息 -->
    <view class="remark-section">
      <text class="remark-label">备注</text>
      <input 
        v-model="remark" 
        placeholder="请输入备注信息" 
        class="remark-input"
        placeholder-class="placeholder"
      />
    </view>
    
    <!-- 价格明细 -->
    <view class="price-detail">
      <view class="price-row">
        <text>商品总价</text>
        <text>¥{{totalPrice.toFixed(2)}}</text>
      </view>
      <view class="price-row total">
        <text>实付金额</text>
        <text class="total-price">¥{{totalPrice.toFixed(2)}}</text>
      </view>
    </view>
    
    <!-- 底部支付栏 -->
    <view class="checkout-footer">
      <view class="price-container">
        <text class="price-label">合计：</text>
        <text class="price">¥{{totalPrice.toFixed(2)}}</text>
      </view>
      <view class="pay-btn" @click="handlePayment">
        <text>立即支付</text>
      </view>
    </view>
  </view>
</template>

<script>
const db = uniCloud.database()
let orderId;

export default {
  data() {
    return {
      tableNumber: '', // 桌号
      remark: '',      // 备注
      cartItems: {},   // 购物车商品 {id: count}
      cartSpecs: {},   // 购物车规格信息 {id: {specName: optionName}}
      products: []     // 商品列表
    }
  },
  computed: {
    totalPrice() {
      return Object.entries(this.cartItems).reduce((sum, [id, count]) => {
        return sum + this.getItemPrice(id) * count
      }, 0)
    }
  },
  onLoad(options) {
	// 测试支付参数（开发时使用）
	if (process.env.NODE_ENV === 'development') {
	  this.cartItems = {'product1': 2};
	  this.tableNumber = 'A12';
	  this.products = [{_id: 'product1', name: '测试商品', price: 99}];
	}
    this.loadCartData(options)
  },
  methods: {
    loadCartData(options) {
      // 方法1：从URL参数获取
      try {
        this.tableNumber = decodeURIComponent(options.tableNumber || '未知桌号')
        
        if (options.cartData) {
          const cartData = JSON.parse(decodeURIComponent(options.cartData))
          this.cartItems = cartData.items || {}
          this.cartSpecs = cartData.specs || {}
          this.products = cartData.products || []
        }
      } catch (e) {
        console.error('URL参数解析失败:', e)
      }

      // 方法2：从全局变量获取（更可靠）
      if (!this.products.length && getApp().globalData.tempCartData) {
        const globalData = getApp().globalData.tempCartData
        this.cartItems = globalData.items || {}
        this.cartSpecs = globalData.specs || {}
        this.products = globalData.products || []
        this.tableNumber = globalData.tableNumber || this.tableNumber
        
        // 使用后清除全局变量
        getApp().globalData.tempCartData = null
      }

      // 方法3：从本地存储获取（终极fallback）
      if (!this.products.length) {
        this.loadFromLocalStorage()
      }
    },
    
    loadFromLocalStorage() {
      try {
        const cartItems = uni.getStorageSync('cart') || {}
        const cartSpecs = uni.getStorageSync('cartSpecs') || {}
        const products = uni.getStorageSync('products') || []
        
        // 过滤无效商品
        this.cartItems = Object.fromEntries(
          Object.entries(cartItems).filter(([id]) => {
            const productId = id.split('|')[0]
            return products.some(p => p._id === productId)
          })
        )
        
        // 过滤无效规格
        this.cartSpecs = Object.fromEntries(
          Object.entries(cartSpecs).filter(([id]) => id in this.cartItems)
        )
        
        this.products = products
      } catch (e) {
        console.error('本地存储读取失败:', e)
      }
    },
    
    getProductById(id) {
      const productId = id.split('|')[0]
      return this.products.find(p => p._id === productId)
    },
    
    getProductImage(id) {
      const product = this.getProductById(id)
      return product ? product.image : '/static/images/default-food.png'
    },
    
    getProductName(id) {
      const product = this.getProductById(id)
      return product ? product.name : '未知商品'
    },
    
    getSpecsText(id) {
      if (!this.cartSpecs[id]) return ''
      return Object.values(this.cartSpecs[id]).join(' ')
    },
    
    getItemPrice(id) {
      const product = this.getProductById(id)
      if (!product) return 0
      
      let price = product.price
      
      // 加上规格价格
      if (this.cartSpecs[id]) {
        Object.entries(this.cartSpecs[id]).forEach(([specName, optionName]) => {
          const spec = product.specs?.find(s => s.name === specName)
          if (spec) {
            const option = spec.options.find(o => o.name === optionName)
            if (option) {
              price += option.price
            }
          }
        })
      }
      
      return price
    },
    
		async handlePayment() {
		  // 1. 基础校验
		  if (Object.keys(this.cartItems).length === 0) {
			return uni.showToast({ title: '购物车为空', icon: 'none' });
		  }
		  if (!this.tableNumber?.trim()) {
			return uni.showToast({ title: '请选择桌号', icon: 'none' });
		  }

		  try {
			uni.showLoading({ title: '创建订单中...', mask: true });

			// 2. 生成订单号（独立云函数）
			const orderNoRes = await uniCloud.callFunction({
			  name: 'generate-order-no'
			});
			if (orderNoRes.result.code !== 200) {
			  throw new Error(orderNoRes.result.message || '生成订单号失败');
			}

			// 3. 创建订单数据
			const orderData = {
			  order_no: orderNoRes.result.data.order_no,
			  table_number: this.tableNumber,
			  food_list: Object.entries(this.cartItems).map(([id, count]) => ({
				food_id: id.split('|')[0],
				name: this.getProductName(id),
				price: this.getItemPrice(id),
				quantity: count,
				specs: this.cartSpecs[id] ? JSON.stringify(this.cartSpecs[id]) : null,
				image: this.getProductImage(id)
			  })),
			  total_price: this.totalPrice,
			  status: '待支付',
			  remark: this.remark,
			  create_time: Date.now()
			};

			// 4. 保存订单到数据库
			const orderRes = await db.collection('order').add(orderData);
			orderId = orderRes.result.id;

			// 5. 调用支付云函数
			const paymentRes = await uniCloud.callFunction({
			  name: 'payment',
			  data: {
				action: 'create',
				order_id: orderId,
				payment_method: 'wechat'
			  }
			});

			// 6. 严格校验返回结果
			if (!paymentRes.result) {
			  throw new Error('支付服务无响应');
			}
			if (paymentRes.result.code !== 200) {
			  throw new Error(paymentRes.result.message || '支付创建失败');
			}
			if (!paymentRes.result.data?.paymentParams) {
			  console.error('异常返回结构:', paymentRes.result);
			  throw new Error('支付参数缺失');
			}

			// 7. 发起客户端支付
			const { timeStamp, nonceStr, package: pack, signType, paySign } = 
			  paymentRes.result.data.paymentParams;

			const [paymentSuccess] = await Promise.all([
			  new Promise((resolve) => {
				uni.requestPayment({
				  provider: 'wxpay',
				  timeStamp,
				  nonceStr,
				  package: pack,
				  signType,
				  paySign,
				  success: () => resolve(true),
				  fail: (err) => resolve(false)
				});
			  }),
			  // 添加3秒延迟防止加载框闪退
			  new Promise(resolve => setTimeout(resolve, 3000))
			]);

			// 8. 处理支付结果
			if (paymentSuccess) {
			  await db.collection('order').doc(orderId).update({
				status: '已支付',
				pay_time: Date.now()
			  });
			  
			  // 清空购物车
			  uni.setStorageSync('cart', {});
			  uni.setStorageSync('cartSpecs', {});
			  getApp().globalData.tempCartData = null;
			  
			  uni.redirectTo({
				url: `/pages/order/success?order_id=${orderId}`
			  });
			} else {
			  throw new Error('支付已取消');
			}

		  } catch (e) {
			uni.hideLoading();
			console.error('支付全流程错误:', e);
			
			// 友好错误提示
			let errMsg = e.message || '支付失败';
			if (e.errMsg?.includes('cancel')) errMsg = '支付已取消';
			if (e.message?.includes('网络错误')) errMsg = '网络连接失败';
			
			uni.showToast({
			  title: errMsg,
			  icon: 'none',
			  duration: 3000
			});

			// 失败时更新订单状态
			if (orderId) {
			  await db.collection('order').doc(orderId).update({
				status: '失败'
			  });
			}
		  }
		}
	}
}
</script>

<style>
.checkout-container {
  padding-bottom: 120rpx;
  background-color: #f5f5f5;
}

/* 桌号样式 */
.table-section {
  margin: 20rpx;
  padding: 30rpx;
  background: #fff;
  border-radius: 12rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
}

.table-label {
  font-weight: bold;
  margin-right: 20rpx;
}

.table-number {
  color: #4a90e1;
  font-weight: bold;
}

/* 商品列表样式 */
.goods-list {
  margin: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 0 20rpx;
  max-height: 50vh;
  width: calc(100% - 40rpx);
  box-sizing: border-box;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.goods-item {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  width: 100%;
}

.goods-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.goods-info {
  flex: 1;
  max-width: calc(100% - 160rpx);
  overflow: hidden;
}

.goods-name {
  font-size: 28rpx;
  margin-bottom: 10rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.goods-spec {
  font-size: 24rpx;
  color: #999;
}

.goods-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 120rpx;
}

.goods-price {
  font-size: 28rpx;
  color: #f60;
  margin-bottom: 10rpx;
}

.goods-count {
  font-size: 26rpx;
  color: #666;
}

/* 备注样式 */
.remark-section {
  margin: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
}

.remark-label {
  font-size: 28rpx;
  margin-right: 20rpx;
  font-weight: bold;
}

.remark-input {
  flex: 1;
  font-size: 28rpx;
}

.placeholder {
  color: #ccc;
}

/* 价格明细样式 */
.price-detail {
  margin: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
}

.price-row {
  display: flex;
  justify-content: space-between;
  font-size: 30rpx;
  margin-bottom: 20rpx;
  color: #666;
}

.price-row.total {
  border-top: 1rpx solid #f5f5f5;
  padding-top: 20rpx;
  margin-top: 20rpx;
  color: #333;
  font-weight: bold;
}

.total-price {
  color: #f60;
  font-weight: bold;
  font-size: 36rpx;
}

/* 底部支付栏样式 */
.checkout-footer {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 100rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
  z-index: 10;
  padding-left: 20rpx;
}

.price-container {
  display: flex;
  align-items: baseline;
  margin-right: 20rpx;
  flex: 1;
}

.price-label {
  font-size: 28rpx;
  margin-right: 10rpx;
}

.price {
  font-size: 36rpx;
  color: #f60;
  font-weight: bold;
}

.pay-btn {
  width: 250rpx;
  height: 80rpx;
  background: #4a90e1;
  color: #fff;
  border-radius: 40rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 32rpx;
  margin-right: 20rpx;
}
</style>