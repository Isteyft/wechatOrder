<template>
  <view class="container">
    <uni-card title="菜品信息">
      <uni-forms ref="formRef" :modelValue="formData" :rules="rules" validateTrigger="bind">
        <uni-forms-item label="菜品名称" name="name" required>
          <uni-easyinput v-model="formData.name" placeholder="请输入菜品名称" />
        </uni-forms-item>
        
        <uni-forms-item label="基础价格" name="price" required>
          <uni-number-box 
            v-model="formData.price" 
            :min="0" 
            :max="9999"
            :step="0.01"
            :precision="2"
            placeholder="请输入价格"
            @blur="handlePriceBlur"
          />
        </uni-forms-item>
        
        <uni-forms-item label="分类" name="category" required>
          <uni-data-select 
            v-model="formData.category" 
            :localdata="categories" 
            placeholder="请选择分类"
          />
        </uni-forms-item>
        
        <uni-forms-item label="菜品图片" name="image" required>
          <uni-file-picker 
            v-model="formData.image" 
            file-mediatype="image" 
            :image-styles="{width: 120, height: 90, border: {radius: '6px'}}"
            :auto-upload="false"
            @select="handleImageSelect"
            @delete="handleImageDelete"
            @progress="handleUploadProgress"
            @success="handleUploadSuccess"
            @fail="handleUploadFail"
            limit="1"
          />
          <view class="upload-tip" v-if="uploading">
            上传中: {{uploadProgress}}%
          </view>
        </uni-forms-item>
        
        <uni-forms-item label="描述" name="description">
          <uni-easyinput 
            type="textarea" 
            v-model="formData.description" 
            placeholder="请输入菜品描述" 
          />
        </uni-forms-item>
        
        <uni-forms-item label="状态" name="status" required>
          <uni-data-checkbox 
            v-model="formData.status" 
            :localdata="statusList" 
          />
        </uni-forms-item>
        
        <uni-forms-item label="排序" name="sort">
          <uni-number-box 
            v-model="formData.sort" 
            :min="0" 
            :max="999" 
          />
        </uni-forms-item>
      </uni-forms>
      
      <!-- 规格设置部分 -->
      <uni-card title="规格设置" class="spec-card">
        <view v-for="(spec, specIndex) in formData.specs" :key="specIndex" class="spec-item">
          <view class="spec-header">
            <uni-easyinput 
              v-model="spec.name" 
              placeholder="规格名称(如份量、口味)" 
              class="spec-name"
            />
            <uni-icons 
              type="trash" 
              size="24" 
              color="#dd524d" 
              @click="removeSpec(specIndex)"
            />
          </view>
          
          <view v-for="(option, optionIndex) in spec.options" :key="optionIndex" class="option-item">
            <uni-easyinput 
              v-model="option.name" 
              placeholder="选项名称" 
              class="option-name"
            />
            <uni-number-box 
              v-model="option.price" 
              :min="-999" 
              :max="999" 
              :step="1"
              placeholder="价格增量"
              class="option-price"
            />
            <uni-icons 
              type="minus" 
              size="24" 
              color="#dd524d" 
              @click="removeOption(specIndex, optionIndex)"
            />
          </view>
          
          <button class="mini-btn" @click="addOption(specIndex)">添加选项</button>
        </view>
        
        <button class="add-spec-btn" @click="addSpec">添加规格</button>
      </uni-card>
      
      <view class="action-buttons">
        <button class="btn save-btn" @click="handleSubmit" :disabled="uploading">保存</button>
        <button class="btn cancel-btn" @click="goBack">取消</button>
      </view>
    </uni-card>
  </view>
</template>

<script>
export default {
  data() {
    return {
      formData: {
        name: '',
        price: null,
        category: '',
        image: null,
        tempFile: null,
        description: '',
        status: 'on',
        sort: 100,
        specs: [] // 规格数组
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
      ],
      uploading: false,
      uploadProgress: 0,
      rules: {
        name: {
          rules: [
            { required: true, errorMessage: '菜品名称不能为空' },
            { minLength: 2, maxLength: 20, errorMessage: '名称长度在2-20个字符之间' }
          ]
        },
        price: {
          rules: [
            { required: true, errorMessage: '价格不能为空' },
            {
              validateFunction: (rule, value, callback) => {
                if (value === null || value === undefined || value === '') {
                  callback('请输入价格')
                  return false
                }
                const numValue = Number(value)
                if (isNaN(numValue)) {
                  callback('请输入有效的数字')
                  return false
                }
                if (numValue < 0) {
                  callback('价格不能小于0')
                  return false
                }
                if (numValue > 9999) {
                  callback('价格不能超过9999')
                  return false
                }
                return true
              }
            }
          ]
        },
        category: {
          rules: [
            { required: true, errorMessage: '请选择分类' }
          ]
        },
        image: {
          rules: [
            { 
              validateFunction: (rule, value, callback) => {
                if (!value || (Array.isArray(value) && value.length === 0)) {
                  callback('请上传菜品图片')
                  return false
                }
                return true
              }
            }
          ]
        },
        status: {
          rules: [
            { required: true, errorMessage: '请选择状态' }
          ]
        }
      }
    }
  },
  onLoad(options) {
    if (options.id) {
      this.loadFoodData(options.id)
    }
  },
  methods: {
    async loadFoodData(id) {
      try {
        const db = uniCloud.database()
        const res = await db.collection('food').doc(id).get()
        if (res.result.data.length > 0) {
          const data = res.result.data[0]
          this.formData = {
            ...data,
            _id: id,
            price: data.price !== undefined ? Number(data.price) : null,
            tempFile: null,
            specs: data.specs || []
          }
          
          if (data.image) {
            this.formData.image = [{
              url: data.image,
              extname: 'image',
              name: 'food-image'
            }]
          }
        }
      } catch (e) {
        uni.showToast({
          title: `加载失败: ${e.message}`,
          icon: 'none',
          duration: 3000
        })
      }
    },
    
    handlePriceBlur() {
      if (this.formData.price !== null) {
        this.formData.price = parseFloat(this.formData.price.toFixed(2))
      }
    },
    
    handleImageSelect(e) {
      const file = e.tempFiles[0]
      this.formData.tempFile = file
      this.formData.image = file.path
    },
    
    handleImageDelete() {
      this.formData.image = null
      this.formData.tempFile = null
    },
    
    handleUploadProgress(e) {
      this.uploadProgress = e.progress
    },
    
    handleUploadSuccess(e) {
      this.uploading = false
      this.formData.image = e.fileID
      this.formData.tempFile = null
      uni.showToast({
        title: '图片上传成功',
        icon: 'success',
        duration: 1500
      })
    },
    
    handleUploadFail(e) {
      this.uploading = false
      console.error('图片上传失败:', e)
      uni.showToast({
        title: '图片上传失败',
        icon: 'none',
        duration: 2000
      })
    },
    
    async uploadImage() {
      if (!this.formData.tempFile) {
        return Promise.resolve()
      }
      
      this.uploading = true
      this.uploadProgress = 0
      
      try {
        const uploadTask = uniCloud.uploadFile({
          filePath: this.formData.tempFile.path,
          cloudPath: `food-images/${Date.now()}-${this.formData.tempFile.name}`,
          onUploadProgress: (res) => {
            this.uploadProgress = res.progress
          }
        })
        
        const result = await uploadTask
        return result
      } catch (e) {
        console.error('上传图片失败:', e)
        throw e
      } finally {
        this.uploading = false
      }
    },
    
    // 规格操作方法
    addSpec() {
      this.formData.specs.push({
        name: '',
        options: [
          { name: '', price: 0 }
        ]
      })
    },
    
    removeSpec(index) {
      this.formData.specs.splice(index, 1)
    },
    
    addOption(specIndex) {
      this.formData.specs[specIndex].options.push({
        name: '',
        price: 0
      })
    },
    
    removeOption(specIndex, optionIndex) {
      this.formData.specs[specIndex].options.splice(optionIndex, 1)
    },
    
    async handleSubmit() {
      try {
        // 验证表单
        const validateRes = await this.$refs.formRef.validate()
        
        // 验证规格
        for (const spec of this.formData.specs) {
          if (!spec.name || spec.name.trim() === '') {
            throw new Error('请填写所有规格名称')
          }
          
          for (const option of spec.options) {
            if (!option.name || option.name.trim() === '') {
              throw new Error('请填写所有选项名称')
            }
          }
        }
        
        // 上传图片
        const uploadResult = await this.uploadImage()
        
        // 准备提交数据
        const submitData = {
          name: this.formData.name,
          price: Number(this.formData.price),
          category: this.formData.category,
          description: this.formData.description,
          status: this.formData.status,
          sort: this.formData.sort || 100,
          specs: this.formData.specs
        }
        
        // 处理图片
        if (uploadResult && uploadResult.fileID) {
          submitData.image = uploadResult.fileID
        } else if (this.formData.image && this.formData.image[0] && this.formData.image[0].url) {
          submitData.image = this.formData.image[0].url
        } else {
          throw new Error('请上传菜品图片')
        }
        
        // 数据库操作
        const db = uniCloud.database()
        if (this.formData._id) {
          // 更新现有记录
          await db.collection('food').doc(this.formData._id).update(submitData)
        } else {
          // 创建新记录
          await db.collection('food').add({
            ...submitData,
            create_time: Date.now()
          })
        }
        
        uni.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        })
        
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
        
      } catch (e) {
        if (e.errorCode === 'VALIDATE_FAILED') {
          return
        }
        
        console.error('保存失败:', e)
        uni.showToast({ 
          title: `保存失败: ${e.message || e.errMsg}`,
          icon: 'none',
          duration: 3000
        })
      }
    },
    
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.container {
  padding: 15px;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  gap: 15px;
}

.btn {
  flex: 1;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 16px;
}

.save-btn {
  background-color: #007AFF;
  color: #fff;
}

.cancel-btn {
  background-color: #F1F1F1;
  color: #666;
}

:deep(.uni-forms-item__error) {
  padding-top: 4px;
  color: #dd524d;
  font-size: 12px;
}

.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

/* 规格设置样式 */
.spec-card {
  margin-top: 20px;
}

.spec-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.spec-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.spec-name {
  flex: 1;
  margin-right: 10px;
}

.option-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.option-name {
  flex: 1;
  margin-right: 10px;
}

.option-price {
  width: 120px;
  margin-right: 10px;
}

.mini-btn {
  font-size: 12px;
  padding: 0 10px;
  height: 30px;
  line-height: 30px;
}

.add-spec-btn {
  margin-top: 15px;
  width: 100%;
}
</style>