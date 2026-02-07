# UI 重构工作计划 - 基于 Stitch 设计稿

基于 Stitch AI 生成的 7 张设计稿，对家庭健康管理平台前端进行视觉层重构。保持所有业务逻辑、API 调用、状态管理不变，仅改动样式和部分 JSX 结构。

**设计稿位置**: `doc/design/stitch/stitch_health_platform_login_variant_1*/`

---

## 阶段 1: 全局基础设施

### 步骤 1.1: 更新 Ant Design 主题令牌 [低] ✅

**文件**: `frontend/src/main.tsx` (第 30-35 行)

将当前最小配置扩展为完整设计令牌：

```typescript
// 当前
theme={{
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
}}

// 目标
theme={{
  token: {
    colorPrimary: '#136dec',
    colorSuccess: '#13ec5b',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#136dec',
    colorBgLayout: '#f6f7f8',
    colorBgContainer: '#ffffff',
    colorBorder: '#e7edf3',
    colorText: '#0d141b',
    colorTextSecondary: '#4c739a',
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  components: {
    Card: { borderRadiusLG: 16 },
    Button: { borderRadius: 10, controlHeight: 40, controlHeightLG: 48 },
    Menu: { itemBorderRadius: 8, itemMarginInline: 8 },
    Input: { borderRadius: 10, controlHeight: 40 },
    Select: { borderRadius: 10, controlHeight: 40 },
    Table: { borderRadius: 12, headerBg: '#fafbfc' },
  },
}}
```

### 步骤 1.2: 添加 Manrope 字体 [低] ✅

**文件**: `frontend/index.html` (第 5-6 行间插入)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

同时更新 `<title>` 为 "家庭健康管理平台"。

### 步骤 1.3: 更新全局 CSS [低] ✅

**文件**: `frontend/src/styles/global.css`

- 第 11-12 行: `font-family` 改为以 `'Manrope'` 开头
- 第 16 行: `background-color` 从 `#f0f2f5` 改为 `#f6f7f8`
- 第 26 行: 滚动条颜色 `#d9d9d9` 改为 `#cbd5e1`
- 新增卡片悬停动效:

```css
.ant-card-hoverable:hover {
  box-shadow: 0 6px 20px rgba(19, 109, 236, 0.12) !important;
  transform: translateY(-2px);
  transition: all 0.3s ease;
}
```

### 步骤 1.4: 验证阶段 1

启动前端 `cd frontend && pnpm run dev`，确认:
- [ ] Manrope 字体正确加载
- [ ] 背景色变为 `#f6f7f8`
- [ ] 按钮/组件主色变为 `#136dec`
- [ ] 圆角已增大
- [ ] 无控制台错误

---

## 阶段 2: 布局组件重构

### 步骤 2.1: 重构 MainLayout [高] ✅

**文件**: `frontend/src/components/Layout/MainLayout.tsx`

**A. Logo 区域改动:**
- 增加健康图标 (HeartOutlined)
- 主色改为 `#136dec`
- 字号增大到 20px，字重 700
- 增加上下内边距 (padding: 20px 0)

**B. 侧边栏样式改动:**
- 背景改为 `#fafbfc`
- 边框改为 `1px solid #e7edf3`

**C. Header 改动:**
- 底部边框改为柔和阴影: `boxShadow: '0 1px 4px rgba(0,0,0,0.04)'`
- 用户头像区域增加 hover 效果

**D. Content 改动:**
- borderRadius 改为 16
- 增加微阴影: `boxShadow: '0 1px 4px rgba(0,0,0,0.03)'`

### 步骤 2.2: 验证布局

- [ ] 侧边栏外观更新
- [ ] 菜单折叠/展开正常
- [ ] 移动端 Drawer 正常
- [ ] 所有导航跳转正常

---

## 阶段 3: 各页面逐一重构

### 步骤 3.1: 登录页重构 [高] ✅

**文件**: `frontend/src/pages/Auth/Login.tsx`

**结构改动 (最大的一处):**
- 从居中卡片 + 渐变背景 → 左右分栏布局
- 左侧面板 (45%): 蓝色渐变背景 + 品牌标语 + 装饰元素
- 右侧面板 (55%): 白色背景 + 登录表单
- 移动端: 左侧面板隐藏，仅显示登录表单

**颜色替换:**
- `#667eea`/`#764ba2` 渐变 → `#136dec`/`#0d5bc4` 渐变 (左侧面板)
- `#1890ff` → `#136dec`

### 步骤 3.2: 仪表盘重构 [中] ✅

**文件**: `frontend/src/pages/Dashboard/index.tsx`

- 统计卡片: 图标放入圆形背景, 数字字号增大到 32px, 布局改为左右结构
- 颜色: `#1890ff` → `#136dec`, `#52c41a` → `#13ec5b`
- 引导卡片: 背景改为 `#eef4ff`, 边框改为 `#c0d8ff`
- 成员卡片: Avatar 男性颜色 `#1890ff` → `#136dec`

### 步骤 3.3: 家庭成员页重构 [中] ✅

**文件**: `frontend/src/pages/Members/MemberList.tsx`

- Avatar 增大到 80px
- 卡片增加内边距
- 男性颜色 `#1890ff` → `#136dec`
- 页面标题字号增大

### 步骤 3.4: 健康记录页重构 [中] ✅

**文件**: `frontend/src/pages/Records/RecordList.tsx`

- 筛选器卡片圆角增大
- 移动端列表数值颜色 `#1890ff` → `#136dec`
- 表格受全局主题控制，改动不大

### 步骤 3.5: 健康趋势页重构 [低] ✅

**文件**: `frontend/src/pages/Records/RecordTrend.tsx`

- ECharts 配色更新:
  - 正常值线: `#1890ff` → `#136dec`
  - 参考范围: `#52c41a` → `#13ec5b`
  - 参考区域透明度同步调整

### 步骤 3.6: 健康文档页重构 [低] ✅

**文件**: `frontend/src/pages/Documents/DocumentList.tsx`

- 与健康记录页模式相同，筛选器圆角增大
- 表格受全局主题控制

### 步骤 3.7: AI 健康建议页重构 [中] ✅

**文件**: `frontend/src/pages/Advice/AdvicePage.tsx`

- 健康评分圆环颜色: 优秀/良好 `#52c41a` → `#13ec5b`
- 蓝色默认色: `#1890ff` → `#136dec`
- Collapse 面板增加 borderRadius
- 行动清单序号背景改为 `#eef4ff`

### 步骤 3.8: AI 健康咨询页重构 [中] ✅

**文件**: `frontend/src/pages/Chat/ChatPage.tsx`

- 用户气泡/头像: `#1890ff` → `#136dec`
- AI 头像: `#52c41a` → `#13ec5b`
- AI 气泡背景: `#f5f5f5` → `#f5f7fa`
- 气泡圆角增大到 16px
- 会话列表: 背景 `#fafafa` → `#fafbfc`, 边框 → `#e7edf3`
- 输入区: 背景和边框同步更新

---

## 阶段 4: 收尾

### 步骤 4.1: 全局颜色替换 [低] ✅

全局搜索替换剩余的 `#1890ff` → `#136dec`，涉及文件:
- `frontend/src/pages/Documents/DocumentDetail.tsx`
- `frontend/src/components/WhitelistManager.tsx`
- `frontend/src/pages/Family/index.tsx`
- `frontend/src/pages/Members/MemberDetail.tsx`
- `frontend/src/pages/Members/MemberForm.tsx`
- `frontend/src/pages/Records/RecordAdd.tsx`

评估 `#52c41a` → `#13ec5b` 替换（仅健康/成功语义处）。

### 步骤 4.2: 最终验证

逐页检查:
- [ ] 登录页: 左右分栏正常，移动端仅右侧
- [ ] 仪表盘: 统计卡片新样式
- [ ] 家庭成员: 大头像卡片正常
- [ ] 健康记录: 表格/列表/筛选器正常
- [ ] 健康趋势: ECharts 图表颜色正确
- [ ] 健康文档: 表格/列表正常
- [ ] AI 健康建议: 评分圆环正确，面板展开正常
- [ ] AI 健康咨询: 气泡颜色正确，SSE 流式正常
- [ ] 移动端: 所有页面窄屏正常
- [ ] 侧边栏: 折叠/展开和导航正常

---

## Git 提交策略

每完成一个阶段或重要步骤立即提交:

1. `feat: 更新全局主题令牌和字体配置` (阶段 1)
2. `feat: 重构主布局侧边栏和头部样式` (阶段 2)
3. `feat: 重构登录页为左右分栏布局` (步骤 3.1)
4. `feat: 重构仪表盘和家庭成员页样式` (步骤 3.2-3.3)
5. `feat: 重构健康记录和文档页样式` (步骤 3.4-3.6)
6. `feat: 重构 AI 健康建议和咨询页样式` (步骤 3.7-3.8)
7. `feat: 全局颜色统一替换收尾` (阶段 4)

---

## 风险与注意事项

1. **Ant Design v6 兼容性**: 部分 components 级别的令牌可能名称不同，需实测确认
2. **登录页结构改动**: 唯一涉及 JSX 大幅变动的页面，注意移动端适配
3. **ECharts 不受 Ant Design 主题控制**: 需手动更新颜色值
4. **字体加载**: Manrope 是外部字体，字体族列表有系统字体兜底
5. **不引入新依赖**: 不添加 Tailwind/styled-components 等，保持现有内联样式方案
