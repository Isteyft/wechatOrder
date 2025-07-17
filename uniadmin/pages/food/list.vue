<template>
  <view class="container">
    <uni-card>
      <view class="search-bar">
        <uni-search-bar placeholder="搜索菜品名称" @input="onSearch"></uni-search-bar>
        <uni-data-select v-model="filter.category" :localdata="categories" placeholder="全部分类"></uni-data-select>
        <uni-data-select v-model="filter.status" :localdata="statusList" placeholder="全部状态"></uni-data-select>
      </view>
      
      <uni-button type="primary" @click="addFood">添加菜品</uni-button>
      
      <uni-table emptyText="暂无菜品" v-if="!loading">
        <uni-tr>
          <uni-th width="80">图片</uni-th>
          <uni-th width="150" align="center">名称</uni-th>
          <uni-th width="80" align="center">价格</uni-th>
          <uni-th width="100" align="center">分类</uni-th>
          <uni-th width="80" align="center">状态</uni-th>
          <uni-th width="150" align="center">操作</uni-th>
        </uni-tr>
        <uni-tr v-for="item in foodList" :key="item._id">
          <uni-td>
            <image 
              :src="item.image || '/static/default-food.png'" 
              mode="aspectFill" 
              style="width:60px;height:45px"
              @error="handleImageError(item)"
            />
          </uni-td>
          <uni-td>{{item.name}}</uni-td>
          <uni-td align="center">¥{{item.price.toFixed(2)}}</uni-td>
          <uni-td align="center">{{item.category}}</uni-td>
          <uni-td align="center">
            <uni-tag :text="item.status === 'on' ? '上架' : '下架'" 
                    :type="item.status === 'on' ? 'success' : 'default'"></uni-tag>
          </uni-td>
          <uni-td align="center">
            <uni-icons type="compose" size="20" color="#4cd964" @click="editItem(item)"></uni-icons>
            <uni-icons type="trash" size="20" color="#dd524d" @click="deleteItem(item._id)"></uni-icons>
          </uni-td>
        </uni-tr>
      </uni-table>
      
      <uni-load-more v-if="loading" status="loading"></uni-load-more>
      
      <uni-pagination 
        :current="currentPage" 
        :total="totalCount" 
        :page-size="pageSize" 
        @change="onPageChange"
        v-if="totalCount > 0">
      </uni-pagination>
    </uni-card>
  </view>
</template>

<script>
export default {
  data() {
    return {
      foodList: [],
      currentPage: 1,
      totalCount: 0,
      pageSize: 10,
      loading: false,
      searchTimer: null,
      filter: {
        name: '',
        category: '',
        status: ''
      },
      categories: [
        { text: '热菜', value: '热菜' },
        { text: '凉菜', value: '凉菜' },
        { text: '主食', value: '主食' },
        { text: '汤羹', value: '汤羹' },
        { text: '饮品', value: '饮品' },
        { text: '甜品', value: '甜品' }
      ],
      statusList: [
        { text: '上架', value: 'on' },
        { text: '下架', value: 'off' }
      ]
    }
  },
  watch: {
    filter: {
      deep: true,
      handler() {
        this.currentPage = 1 // 重置页码
        this.loadData()
      }
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      uni.showLoading({ title: '加载中...' })
      
      try {
        const db = uniCloud.database()
        let where = {}
        
        if (this.filter.name) {
          where.name = new RegExp(this.filter.name, 'i')
        }
        if (this.filter.category) {
          where.category = this.filter.category
        }
        if (this.filter.status) {
          where.status = this.filter.status
        }
        
        const res = await db.collection('food')
          .where(where)
          .orderBy('sort', 'desc')
          .skip((this.currentPage - 1) * this.pageSize)
          .limit(this.pageSize)
          .get()
          
        this.foodList = res.result.data
        
        const countRes = await db.collection('food')
          .where(where)
          .count()
          
        this.totalCount = countRes.result.total
      } catch (e) {
        uni.showToast({
          title: `加载失败: ${e.message}`,
          icon: 'none'
        })
        console.error('加载数据错误:', e)
      } finally {
        this.loading = false
        uni.hideLoading()
      }
    },
    onSearch(e) {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.filter.name = e.value
      }, 300)
    },
    onPageChange(e) {
      this.currentPage = e.current
      this.loadData()
    },
    addFood() {
      uni.navigateTo({
        url: 'edit'
      })
    },
    editItem(item) {
      uni.navigateTo({
        url: `edit?id=${item._id}`
      })
    },
    async deleteItem(id) {
      try {
        const res = await uni.showModal({
          title: '确认删除',
          content: '确定要删除该菜品吗？',
          confirmText: '删除',
          confirmColor: '#dd524d'
        })
        
        if (res.confirm) {
          uni.showLoading({ title: '删除中...' })
          const db = uniCloud.database()
          await db.collection('food').doc(id).remove()
          
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
          
          // 如果当前页最后一条被删除，且不是第一页
          if (this.foodList.length === 1 && this.currentPage > 1) {
            this.currentPage--
          }
          
          this.loadData()
        }
      } catch (e) {
        uni.showToast({
          title: `删除失败: ${e.message}`,
          icon: 'none'
        })
        console.error('删除错误:', e)
      } finally {
        uni.hideLoading()
      }
    },
    handleImageError(item) {
      item.image = '/static/default-food.png'
    }
  }
}
</script>

<style scoped>
.container {
  padding: 15px;
}
.search-bar {
  display: flex;
  margin-bottom: 15px;
  gap: 10px;
}
</style>