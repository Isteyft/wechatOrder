<template>
  <view class="container">
    <uni-card>
      <view class="filters">
        <uni-search-bar 
          placeholder="搜索取餐码/订单号" 
          @input="onSearch"
          clearable
        ></uni-search-bar>
        <uni-datetime-picker 
          type="daterange" 
          @change="dateChange"
          :clear-icon="true"
        />
        <uni-data-select 
          v-model="filter.status" 
          :localdata="statusList" 
          placeholder="全部状态"
          clearable
        ></uni-data-select>
      </view>
      
      <uni-table 
        emptyText="暂无订单"
        :loading="loading"
      >
        <!-- 表头保持不变 -->
        <uni-tr v-for="item in orderList" :key="item._id">
          <uni-td>{{item.order_no || item._id.slice(-8)}}</uni-td>
          <uni-td align="center">
            <uni-tag :text="item.pickup_code" type="primary"></uni-tag>
          </uni-td>
          <uni-td align="center">
            <uni-tag :text="formatStatus(item.status)" 
                    :type="getStatusColor(item.status)"></uni-tag>
          </uni-td>
          <uni-td align="center">¥{{item.total_price.toFixed(2)}}</uni-td>
          <uni-td>
            <text class="contact-name">{{item.contact_info.name}}</text>
            <text class="contact-phone">{{item.contact_info.phone}}</text>
          </uni-td>
          <uni-td>{{formatTime(item.create_time)}}</uni-td>
          <uni-td align="center">
            <uni-icons 
              type="eye" 
              size="20" 
              @click="viewDetail(item)"
              color="#007AFF"
            ></uni-icons>
          </uni-td>
        </uni-tr>
      </uni-table>
      
      <uni-pagination 
        :current="currentPage" 
        :total="totalCount" 
        :page-size="pageSize" 
        @change="onPageChange"
        :show-icon="true"
      />
    </uni-card>
    
    <!-- 状态操作面板 -->
    <uni-popup ref="statusPopup" type="bottom">
      <view class="status-actions">
        <uni-card>
          <view class="action-title">
            订单操作：{{selectedOrder?.pickup_code || ''}}
            <uni-icons 
              type="close" 
              size="20" 
              @click="closeStatusPopup"
              class="close-icon"
            />
          </view>
          
          <view class="status-select">
            <uni-segmented-control 
              :current="actionIndex" 
              :values="actionList" 
              @clickItem="changeAction"
            />
            
            <button 
              v-if="canChangeStatus"
              class="action-btn" 
              :class="'status-' + nextStatus" 
              @click="updateStatus"
              :disabled="!canChangeStatus"
            >
              {{actionLabels[nextStatus] || nextStatus}}
            </button>
          </view>
        </uni-card>
      </view>
    </uni-popup>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orderList: [],
      selectedOrder: null,
      currentPage: 1,
      totalCount: 0,
      pageSize: 10,
      loading: false,
      searchTimer: null,
      filter: {
        searchText: '',
        dateRange: [],
        status: ''
      },
      statusList: [
        { text: '全部状态', value: '' },
        { text: '待支付', value: 'pending' },
        { text: '已支付', value: 'paid' },
        { text: '制作中', value: 'cooking' },
        { text: '已完成', value: 'completed' },
        { text: '已取消', value: 'cancelled' }
      ],
      statusActions: {
        pending: ['paid', 'cancelled'],
        paid: ['cooking', 'cancelled'],
        cooking: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      },
      actionLabels: {
        pending: '待支付',
        paid: '支付成功',
        cooking: '开始制作',
        completed: '完成订单',
        cancelled: '取消订单'
      },
      actionIndex: 0,
      nextStatus: ''
    }
  },
  computed: {
    canChangeStatus() {
      return this.nextStatus && 
             this.selectedOrder && 
             this.selectedOrder.status !== this.nextStatus &&
             this.statusActions[this.selectedOrder.status]?.includes(this.nextStatus)
    },
    actionList() {
      if (!this.selectedOrder) return []
      return this.statusActions[this.selectedOrder.status]?.map(status => 
        this.actionLabels[status] || status
      ) || []
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    formatStatus(status) {
      return this.actionLabels[status] || status
    },
    getStatusColor(status) {
      const colors = {
        pending: 'default',
        paid: 'primary',
        cooking: 'warning',
        completed: 'success',
        cancelled: 'error'
      }
      return colors[status] || 'default'
    },
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    },
    async loadData() {
      this.loading = true
      try {
        const db = uniCloud.database()
        let where = {}
        
        if (this.filter.searchText) {
          where.$or = [
            { pickup_code: new RegExp(this.filter.searchText, 'i') },
            { order_no: new RegExp(this.filter.searchText, 'i') },
            { 'contact_info.name': new RegExp(this.filter.searchText, 'i') },
            { 'contact_info.phone': new RegExp(this.filter.searchText, 'i') }
          ]
        }
        
        if (this.filter.status) {
          where.status = this.filter.status
        }
        
        if (this.filter.dateRange?.length === 2) {
          where.create_time = {
            $gte: this.filter.dateRange[0],
            $lte: this.filter.dateRange[1]
          }
        }
        
        const res = await db.collection('order')
          .where(where)
          .orderBy('create_time', 'desc')
          .skip((this.currentPage - 1) * this.pageSize)
          .limit(this.pageSize)
          .get()
          
        this.orderList = res.result.data
        
        const countRes = await db.collection('order')
          .where(where)
          .count()
          
        this.totalCount = countRes.result.total
      } catch (e) {
        uni.showToast({
          title: `加载失败: ${e.message}`,
          icon: 'none',
          duration: 3000
        })
        console.error('订单加载错误:', e)
      } finally {
        this.loading = false
      }
    },
    onSearch(e) {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.filter.searchText = e.value
        this.currentPage = 1
        this.loadData()
      }, 500)
    },
    dateChange(e) {
      this.filter.dateRange = e || []
      this.currentPage = 1
      this.loadData()
    },
    onPageChange(e) {
      this.currentPage = e.current
      this.loadData()
    },
    viewDetail(order) {
      this.selectedOrder = order
      this.actionIndex = 0
      this.nextStatus = this.statusActions[order.status]?.[0] || ''
      this.$refs.statusPopup.open()
    },
    closeStatusPopup() {
      this.$refs.statusPopup.close()
      this.selectedOrder = null
    },
    changeAction(e) {
      this.actionIndex = e.currentIndex
      this.nextStatus = this.statusActions[this.selectedOrder.status]?.[e.currentIndex] || ''
    },
    async updateStatus() {
      try {
        if (!this.canChangeStatus) {
          throw new Error('当前状态不允许此操作')
        }
        
        uni.showLoading({ title: '更新中...' })
        const db = uniCloud.database()
        
        await db.collection('order').doc(this.selectedOrder._id).update({
          status: this.nextStatus,
          update_time: Date.now()
        })
        
        uni.showToast({
          title: `状态已更新为${this.actionLabels[this.nextStatus]}`,
          icon: 'success'
        })
        
        this.loadData()
        this.closeStatusPopup()
      } catch (e) {
        uni.showToast({
          title: `更新失败: ${e.message}`,
          icon: 'none',
          duration: 3000
        })
        console.error('状态更新错误:', e)
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 15px;
  padding-bottom: 100px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.status-actions {
  padding: 15px;
  background: #fff;
  border-radius: 12px 12px 0 0;
}

.action-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
  position: relative;
}

.close-icon {
  position: absolute;
  right: 0;
  top: 0;
}

.status-select {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.action-btn {
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: bold;
  font-size: 16px;
  color: #fff;
  border: none;
}

.action-btn[disabled] {
  opacity: 0.5;
}

.status-paid {
  background-color: #007AFF;
}

.status-cooking {
  background-color: #F0AD4E;
}

.status-completed {
  background-color: #4CD964;
}

.status-cancelled {
  background-color: #DD524D;
}

.contact-name {
  display: block;
  font-weight: bold;
}

.contact-phone {
  display: block;
  color: #666;
  font-size: 12px;
}
</style>