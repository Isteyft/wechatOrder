<template>
  <view class="container">
    <!-- 主体内容 -->
    <view class="main-content">
      <!-- 左侧分类导航 -->
      <scroll-view 
        scroll-y 
        class="category-nav"
        :scroll-into-view="'category-'+activeCategory"
      >
        <view 
          v-for="(item, index) in categories" 
          :key="index"
          :id="'category-'+index"
          :class="['category-item', activeCategory === index ? 'active' : '']"
          @click="changeCategory(index)"
        >
          {{item.text}}
        </view>
      </scroll-view>

      <!-- 右侧商品列表 -->
      <scroll-view 
        scroll-y 
        class="product-list"
        :style="{height: scrollHeight + 'px'}"
        @scroll="handleScroll"
        scroll-with-animation
      >
        <view 
          v-for="(category, index) in categories" 
          :key="index"
          :id="'product-section-'+index"
          class="product-section"
        >
          <view class="section-title">{{category.text}}</view>
          <view 
            v-for="item in getProductsByCategory(category.value)" 
            :key="item._id"
            class="product-item"
          >
            <image :src="item.image" mode="aspectFill" class="product-image"></image>
            <view class="product-info">
              <view class="product-text">
                <text class="product-name">{{item.name}}</text>
                <text class="product-desc">{{item.description}}</text>
              </view>

              <view class="product-bottom">
                <text class="product-price">
                  <text class="product-price-unit">¥</text>
                  {{item.price.toFixed(2)}}
                </text>
                <view class="product-btns">
                  <uni-icons 
                    type="minus" 
                    size="25" 
                    color="#4a90e1" 
                    @click="decreaseCart(item)"
                    v-if="getCartCount(item._id) > 0"
                    class="i-jianhao"
                  ></uni-icons>
                  <text class="product-count" v-if="getCartCount(item._id) > 0">{{getCartCount(item._id)}}</text>
                  <uni-icons 
                    type="plus" 
                    size="25" 
                    color="#4a90e1" 
                    @click="handleAddToCart(item)"
                    class="i-jiahao"
                  ></uni-icons>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 购物车底部栏 -->
    <view class="footer">
      <view class="footer-car-container" @click="toggleCartPopup">
        <view class="footer-car" :class="{active: totalCount > 0, animate: cartAnimate}">
          <uni-icons type="cart" size="28" color="#fff"></uni-icons>
          <view class="footer-car-badge" v-if="totalCount > 0">{{totalCount}}</view>
        </view>
        <view class="footer-car-price">
          <text class="footer-car-unit">¥</text>
          <text class="footer-car-total">{{totalPrice.toFixed(2)}}</text>
        </view>
      </view>
      <view class="footer-pay" :class="{disabled: totalCount === 0}" @click="handleCheckout">
        <text>{{totalCount > 0 ? '去结算' : '购物车是空的'}}</text>
      </view>
    </view>

    <!-- 购物车列表弹窗 -->
    <uni-popup ref="cartPopup" type="bottom" :mask-click="true" @maskClick="closeCartPopup">
      <view class="cart-popup">
        <view class="cart-title">
          <text>购物车</text>
          <uni-icons type="close" size="24" color="#999" @click="closeCartPopup"></uni-icons>
        </view>
        <scroll-view scroll-y class="cart-list" :style="{maxHeight: cartListHeight + 'px'}">
          <view v-if="totalCount === 0" class="empty-cart">
            <uni-icons type="cart" size="60" color="#ccc"></uni-icons>
            <text>购物车是空的</text>
          </view>
          <view 
            v-else
            v-for="(count, id) in validCartItems" 
            :key="id"
            class="cart-item"
          >
            <view class="cart-item-info">
              <text class="cart-item-name">{{getCartItemName(id)}}</text>
              <text class="cart-item-price">¥{{getCartItemPrice(id).toFixed(2)}}</text>
            </view>
            <view class="cart-item-btns">
              <uni-icons 
                type="minus" 
                size="20" 
                color="#4a90e1" 
                @click.stop="decreaseCart(getProductById(id.split('|')[0]))"
                class="i-jianhao"
              ></uni-icons>
              <text class="cart-item-count">{{count}}</text>
              <uni-icons 
                type="plus" 
                size="20" 
                color="#4a90e1" 
                @click.stop="addToCart(getProductById(id.split('|')[0]))"
                class="i-jiahao"
              ></uni-icons>
            </view>
          </view>
        </scroll-view>
        <view class="cart-total" v-if="totalCount > 0">
          <text>合计：</text>
          <text class="cart-total-price">¥{{totalPrice.toFixed(2)}}</text>
        </view>
      </view>
    </uni-popup>

    <!-- 规格选择弹窗 -->
    <uni-popup ref="specPopup" type="bottom" :mask-click="true">
      <view class="spec-popup">
        <view class="spec-header">
          <text class="spec-title">选择规格</text>
          <uni-icons type="close" size="24" color="#999" @click="closeSpecPopup"></uni-icons>
        </view>
        <scroll-view scroll-y class="spec-content">
          <view class="product-info">
            <image :src="currentProduct?.image" mode="aspectFill" class="product-image"></image>
            <view class="product-details">
              <text class="product-name">{{currentProduct?.name}}</text>
              <text class="product-price">¥{{getFinalPrice(currentProduct).toFixed(2)}}</text>
            </view>
          </view>
          
          <view v-for="(spec, specIndex) in currentProduct?.specs" :key="specIndex" class="spec-group">
            <text class="spec-name">{{spec.name}}</text>
            <view class="spec-options">
              <view 
                v-for="(option, optionIndex) in spec.options" 
                :key="optionIndex"
                :class="['spec-option', isTempSpecSelected(specIndex, optionIndex) ? 'active' : '']"
                @click="selectSpecOption(specIndex, optionIndex)"
              >
                <text class="option-name">{{option.name}}</text>
                <text v-if="option.price !== 0" class="option-price">
                  {{option.price > 0 ? '+' : ''}}{{option.price.toFixed(2)}}
                </text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="spec-footer">
          <view class="quantity-selector">
            <text class="quantity-label">数量</text>
            <view class="quantity-btns">
              <uni-icons 
                type="minus" 
                size="25" 
                color="#999" 
                @click="decreaseSpecQuantity"
                :class="{disabled: specQuantity <= 1}"
              ></uni-icons>
              <text class="quantity">{{specQuantity}}</text>
              <uni-icons 
                type="plus" 
                size="25" 
                color="#4a90e1" 
                @click="increaseSpecQuantity"
              ></uni-icons>
            </view>
          </view>
          <view class="spec-action">
            <button 
              class="add-to-cart-btn" 
              :class="{disabled: !isAllSpecsSelected}"
              @click="confirmAddToCart"
            >
              {{isAllSpecsSelected ? '加入购物车' : '请选择规格'}}
            </button>
          </view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
const db = uniCloud.database();
const foodCollection = db.collection('food');

export default {
  data() {
    return {
      scrollHeight: 0,
      cartListHeight: 300,
      activeCategory: 0,
      deliveryFee: 0,
      cartAnimate: false,
      sectionTops: [],
      isManualScroll: false,
      categories: [
        { text: '热菜', value: '热菜' },
        { text: '凉菜', value: '凉菜' },
        { text: '主食', value: '主食' },
        { text: '汤羹', value: '汤羹' },
        { text: '饮品', value: '饮品' },
        { text: '甜品', value: '甜品' }
      ],
      products: [],
      cartItems: {},
      cartSpecs: {},
      selectedSpecs: {},
      currentProduct: null,
      specQuantity: 1,
      tempSelectedSpecs: {}
    }
  },
  computed: {
    totalCount() {
      return Object.values(this.cartItems).reduce((sum, count) => sum + count, 0)
    },
    totalPrice() {
      return Object.entries(this.cartItems).reduce((sum, [id, count]) => {
        return sum + this.getCartItemPrice(id) * count
      }, 0)
    },
    validCartItems() {
      return Object.fromEntries(
        Object.entries(this.cartItems).filter(([id]) => {
          const productId = id.split('|')[0]
          return this.products.some(p => p._id === productId)
        })
      )
    },
    isAllSpecsSelected() {
      if (!this.currentProduct?.specs) return true
      return this.currentProduct.specs.every((spec, index) => {
        return this.tempSelectedSpecs[index] !== undefined
      })
    }
  },
  onLoad() {
    this.calcScrollHeight()
    this.loadProducts()
    this.calcCartListHeight()
    this.loadCart()
  },
  onShow() {
    if (this.products.length) {
      uni.setStorageSync('products', this.products);
    }
    this.loadCart();
  },
  mounted() {
    this.calcSectionTops()
  },
  methods: {
    calcScrollHeight() {
      const systemInfo = uni.getSystemInfoSync()
      this.scrollHeight = systemInfo.windowHeight - 100
    },
    calcCartListHeight() {
      const systemInfo = uni.getSystemInfoSync()
      this.cartListHeight = systemInfo.windowHeight * 0.5
    },
    async loadProducts() {
      try {
        const res = await foodCollection.where({
          status: 'on'
        }).orderBy('sort', 'desc').get()
        this.products = res.result.data
        this.cleanInvalidCartItems()
        this.$nextTick(() => {
          this.calcSectionTops()
        })
      } catch (e) {
        console.error('获取商品列表失败:', e)
        uni.showToast({
          title: '获取商品列表失败',
          icon: 'none'
        })
      }
    },
    getProductsByCategory(category) {
      return this.products.filter(item => item.category === category)
    },
    loadCart() {
      try {
        const cart = uni.getStorageSync('cart') || {};
        const cartSpecs = uni.getStorageSync('cartSpecs') || {};
        this.cartItems = cart;
        this.cartSpecs = cartSpecs;
      } catch (e) {
        console.error('加载购物车失败:', e);
      }
    },
    saveCart() {
      uni.setStorageSync('cart', this.cartItems);
      uni.setStorageSync('cartSpecs', this.cartSpecs);
    },
    cleanInvalidCartItems() {
      const newCartItems = {}
      const newCartSpecs = {}
      
      for (const [id, count] of Object.entries(this.cartItems)) {
        const productId = id.split('|')[0]
        if (this.products.some(p => p._id === productId)) {
          newCartItems[id] = count
          if (this.cartSpecs[id]) {
            newCartSpecs[id] = this.cartSpecs[id]
          }
        }
      }
      
      this.cartItems = newCartItems
      this.cartSpecs = newCartSpecs
      this.saveCart()
    },
    changeCategory(index) {
      this.activeCategory = index
      this.isManualScroll = true
      uni.pageScrollTo({
        selector: `#product-section-${index}`,
        duration: 300,
        complete: () => {
          setTimeout(() => {
            this.isManualScroll = false
          }, 500)
        }
      })
    },
    calcSectionTops() {
      const query = uni.createSelectorQuery().in(this)
      this.categories.forEach((_, index) => {
        query.select(`#product-section-${index}`).boundingClientRect()
      })
      query.exec(res => {
        this.sectionTops = res.map(item => item.top)
      })
    },
    handleScroll(e) {
      if (this.isManualScroll) return
      
      const scrollTop = e.detail.scrollTop
      for (let i = 0; i < this.sectionTops.length; i++) {
        if (scrollTop >= this.sectionTops[i] - 50 && 
            (i === this.sectionTops.length - 1 || scrollTop < this.sectionTops[i + 1] - 50)) {
          this.activeCategory = i
          break
        }
      }
    },
    getProductById(id) {
      return this.products.find(p => p._id === id)
    },
    getFinalPrice(product) {
      if (!product) return 0
      let finalPrice = product.price
      if (this.tempSelectedSpecs) {
        Object.entries(this.tempSelectedSpecs).forEach(([specIndex, optionIndex]) => {
          const spec = product.specs[specIndex]
          if (spec && spec.options[optionIndex]) {
            finalPrice += spec.options[optionIndex].price
          }
        })
      }
      return finalPrice
    },
    getCartKey(productId) {
      let specsStr = ''
      if (this.selectedSpecs[productId]) {
        specsStr = Object.entries(this.selectedSpecs[productId])
          .sort((a, b) => a[0] - b[0])
          .map(([specIndex, optionIndex]) => {
            const spec = this.getProductById(productId)?.specs[specIndex]
            if (spec) {
              const option = spec.options[optionIndex]
              return `${spec.name}:${option.name}`
            }
            return ''
          })
          .filter(Boolean)
          .join('|')
      }
      return `${productId}|${specsStr}`
    },
    getCartCount(productId) {
      return Object.entries(this.cartItems)
        .filter(([id]) => id.startsWith(`${productId}|`))
        .reduce((sum, [, count]) => sum + count, 0)
    },
    handleAddToCart(product) {
      if (product.specs && product.specs.length > 0) {
        this.openSpecPopup(product)
      } else {
        this.addToCart(product)
        uni.showToast({
          title: '已添加',
          icon: 'success'
        })
      }
    },
    addToCart(product) {
      if (!product || !product._id) return
      
      const cartKey = this.getCartKey(product._id)
      
      this.cartAnimate = true
      this.cartItems = {
        ...this.cartItems,
        [cartKey]: (this.cartItems[cartKey] || 0) + 1
      }
      
      if (!this.cartSpecs[cartKey]) {
        const specsInfo = {}
        if (this.selectedSpecs[product._id]) {
          Object.entries(this.selectedSpecs[product._id]).forEach(([specIndex, optionIndex]) => {
            const spec = product.specs[specIndex]
            if (spec && spec.options[optionIndex]) {
              specsInfo[spec.name] = spec.options[optionIndex].name
            }
          })
        }
        
        this.cartSpecs = {
          ...this.cartSpecs,
          [cartKey]: specsInfo
        }
      }
      
      this.saveCart()
      
      setTimeout(() => {
        this.cartAnimate = false
      }, 500)
    },
    decreaseCart(product) {
      if (!product || !product._id) return
      
      const cartKey = Object.keys(this.cartItems).find(id => id.startsWith(`${product._id}|`))
      if (!cartKey) return
      
      if (this.cartItems[cartKey] <= 1) {
        const newCartItems = {...this.cartItems}
        delete newCartItems[cartKey]
        this.cartItems = newCartItems
        
        const newCartSpecs = {...this.cartSpecs}
        delete newCartSpecs[cartKey]
        this.cartSpecs = newCartSpecs
      } else {
        this.cartItems = {
          ...this.cartItems,
          [cartKey]: this.cartItems[cartKey] - 1
        }
      }
      this.saveCart()
    },
    getCartItemName(id) {
      const [productId] = id.split('|')
      const product = this.getProductById(productId)
      if (!product) return '未知商品'
      
      let name = product.name
      if (this.cartSpecs[id]) {
        const specs = Object.values(this.cartSpecs[id]).join(' ')
        if (specs) name += ` (${specs})`
      }
      return name
    },
    getCartItemPrice(id) {
      const [productId] = id.split('|')
      const product = this.getProductById(productId)
      if (!product) return 0
      
      let price = product.price
      if (this.cartSpecs[id]) {
        Object.entries(this.cartSpecs[id]).forEach(([specName, optionName]) => {
          const spec = product.specs.find(s => s.name === specName)
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
    toggleCartPopup() {
      if (this.$refs.cartPopup.show) {
        this.$refs.cartPopup.close()
      } else {
        this.$refs.cartPopup.open()
      }
    },
    closeCartPopup() {
      this.$refs.cartPopup.close()
    },
    openSpecPopup(product) {
      this.currentProduct = product
      this.specQuantity = 1
      this.tempSelectedSpecs = {...this.selectedSpecs[product._id] || {}}
      this.$refs.specPopup.open()
    },
    closeSpecPopup() {
      this.$refs.specPopup.close()
    },
    selectSpecOption(specIndex, optionIndex) {
      this.$set(this.tempSelectedSpecs, specIndex, optionIndex)
    },
    isTempSpecSelected(specIndex, optionIndex) {
      return this.tempSelectedSpecs[specIndex] === optionIndex
    },
    increaseSpecQuantity() {
      this.specQuantity++
    },
    decreaseSpecQuantity() {
      if (this.specQuantity > 1) {
        this.specQuantity--
      }
    },
    confirmAddToCart() {
      if (!this.isAllSpecsSelected) {
        uni.showToast({
          title: '请选择完整规格',
          icon: 'none'
        })
        return
      }
      
      if (!this.selectedSpecs[this.currentProduct._id]) {
        this.$set(this.selectedSpecs, this.currentProduct._id, {})
      }
      
      Object.entries(this.tempSelectedSpecs).forEach(([specIndex, optionIndex]) => {
        this.$set(this.selectedSpecs[this.currentProduct._id], specIndex, optionIndex)
      })
      
      for (let i = 0; i < this.specQuantity; i++) {
        this.addToCart(this.currentProduct)
      }
      
      this.closeSpecPopup()
      uni.showToast({
        title: '已添加',
        icon: 'success'
      })
    },
    async handleCheckout() {
      if (this.totalCount === 0) {
        uni.showToast({ title: '购物车是空的', icon: 'none' });
        return;
      }

      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const tableNumber = currentPage.options.tableNumber || '未知桌号';

      const cartData = {
        items: this.validCartItems,
        specs: this.cartSpecs,
        products: this.products,
        tableNumber: tableNumber
      };

      getApp().globalData.tempCartData = cartData;
      const cartDataStr = encodeURIComponent(JSON.stringify(cartData));

      uni.navigateTo({
        url: `/pages/checkout/checkout?tableNumber=${tableNumber}&cartData=${cartDataStr}`,
        success: () => this.closeCartPopup()
      });
    }
  }
}
</script>

<style>
.container {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.main-content {
  display: flex;
  flex: 1;
}

.category-nav {
  width: 160rpx;
  background-color: #f5f5f5;
  overflow-y: scroll;
}

.category-item {
  padding: 30rpx 20rpx;
  font-size: 28rpx;
  color: #666;
  text-align: center;
  border-left: 6rpx solid transparent;
}

.category-item.active {
  color: #FF5A5F;
  font-weight: bold;
  background-color: #fff;
  border-left: 6rpx solid #FF5A5F;
}

.product-list {
  flex: 1;
  overflow-y: scroll;
  padding: 20rpx;
  background-color: #fff;
}

.product-section {
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  padding: 20rpx 0;
  color: #333;
  border-bottom: 1rpx solid #f5f5f5;
}

.product-item {
  display: flex;
  margin-bottom: 20rpx;
  padding: 20rpx;
  border-bottom: 1rpx solid #f8f8f8;
}

.product-image {
  width: 180rpx;
  height: 180rpx;
  object-fit: cover;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 20rpx;
}

.product-text {
  flex: 1;
}

.product-name {
  font-size: 32rpx;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 10rpx;
}

.product-desc {
  font-size: 26rpx;
  color: #999;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 10rpx;
}

.product-price {
  font-size: 36rpx;
  font-weight: bold;
  color: #f60;
  display: flex;
  align-items: baseline;
}

.product-price-unit {
  font-size: 24rpx;
  margin-right: 2rpx;
}

.product-btns {
  display: flex;
  align-items: center;
}

.product-btns .i-jiahao {
  padding: 10rpx;
  color: #4a90e1;
  font-size: 24rpx;
  line-height: 1;
}

.product-btns .i-jianhao {
  padding: 10rpx;
  color: #4a90e1;
  font-size: 24rpx;
  line-height: 1;
}

.product-count {
  margin: 0 16rpx;
  font-size: 28rpx;
  min-width: 30rpx;
  text-align: center;
}

.footer {
  height: 100rpx;
  color: #fff;
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  display: flex;
  z-index: 100;
}

.footer-car-container {
  flex-grow: 1;
  background: #3d3d3f;
  padding-left: 175rpx;
  position: relative;
}

.footer-car {
  position: absolute;
  width: 118rpx;
  height: 118rpx;
  border: 9rpx solid #444;
  left: 25rpx;
  top: -35rpx;
  border-radius: 50%;
  background: #3d3d3f;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 60rpx;
}

.footer-car.active {
  background: #4a90e1;
}

.footer-car-badge {
  position: absolute;
  width: 35rpx;
  height: 35rpx;
  background: #ec5533;
  font-size: 25rpx;
  text-align: center;
  border-radius: 50%;
  line-height: 35rpx;
  right: 0;
  top: 0;
}

.footer-car-price {
  font-size: 40rpx;
  display: flex;
  margin-top: 5rpx;
}

.footer-car-unit {
  font-size: 25rpx;
  margin-bottom: 4rpx;
}

.footer-pay {
  background: #4a90e1;
  width: 250rpx;
  font-size: 35rpx;
  line-height: 100rpx;
  text-align: center;
}

.footer-pay.disabled {
  background: #535356;
}

.footer-car.animate {
  animation: footer-car-animate 500ms ease-in-out;
}

@keyframes footer-car-animate {
  0% { transform: scale(1); }
  25% { transform: scale(0.8); }
  50% { transform: scale(1.1); }
  75% { transform: scale(0.9); }
  100% { transform: scale(1); }
}

.cart-popup {
  background-color: #fff;
  padding: 30rpx;
  border-radius: 20rpx 20rpx 0 0;
  padding-bottom: 120rpx;
}

.cart-title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cart-list {
  margin-bottom: 30rpx;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
  color: #999;
}

.empty-cart text {
  margin-top: 20rpx;
  font-size: 28rpx;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.cart-item-info {
  flex: 1;
}

.cart-item-name {
  font-size: 30rpx;
  display: block;
  margin-bottom: 10rpx;
}

.cart-item-price {
  font-size: 28rpx;
  color: #f60;
}

.cart-item-btns {
  display: flex;
  align-items: center;
}

.cart-item-btns .i-jiahao {
  padding: 10rpx;
  color: #4a90e1;
  font-size: 23rpx;
  line-height: 1;
}

.cart-item-btns .i-jianhao {
  padding: 10rpx;
  color: #4a90e1;
  font-size: 23rpx;
  line-height: 1;
}

.cart-item-count {
  margin: 0 20rpx;
  font-size: 30rpx;
}

.cart-total {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  font-size: 32rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f5f5f5;
}

.cart-total-price {
  color: #f60;
  font-weight: bold;
  margin-left: 10rpx;
}

.spec-popup {
  background-color: #fff;
  border-radius: 20rpx 20rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.spec-header {
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #f5f5f5;
}

.spec-title {
  font-size: 32rpx;
  font-weight: bold;
}

.spec-content {
  flex: 1;
  padding: 0 30rpx;
}

.product-info {
  display: flex;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.product-image {
  width: 150rpx;
  height: 150rpx;
  border-radius: 8rpx;
}

.product-details {
  flex: 1;
  padding-left: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 30rpx;
  color: #333;
}

.product-price {
  font-size: 32rpx;
  color: #f60;
  font-weight: bold;
}

.spec-group {
  margin: 30rpx 0;
}

.spec-name {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  display: block;
}

.spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.spec-option {
  padding: 12rpx 24rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 26rpx;
  background-color: #f9f9f9;
}

.spec-option.active {
  border-color: #4a90e1;
  background-color: #e8f2ff;
  color: #4a90e1;
}

.option-price {
  font-size: 24rpx;
  color: #f60;
  margin-left: 10rpx;
}

.spec-footer {
  padding: 30rpx;
  padding-bottom: 60rpx;
  border-top: 1rpx solid #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quantity-selector {
  display: flex;
  align-items: center;
}

.quantity-label {
  font-size: 28rpx;
  margin-right: 30rpx;
}

.quantity-btns {
  display: flex;
  align-items: center;
}

.quantity {
  margin: 0 30rpx;
  font-size: 30rpx;
  min-width: 40rpx;
  text-align: center;
}

.add-to-cart-btn {
  background-color: #4a90e1;
  color: #fff;
  border-radius: 50rpx;
  padding: 0 60rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 30rpx;
  margin: 0;
}

.add-to-cart-btn.disabled {
  background-color: #ccc;
  opacity: 0.7;
}
</style>