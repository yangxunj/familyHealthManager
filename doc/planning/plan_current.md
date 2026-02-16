# Capacitor 移动端 App 集成 — 工作计划

## 背景

将现有 React Web 应用通过 Capacitor 封装为 Android App（APK），面向老年人用户优化使用体验。Capacitor 会在现有前端项目中添加原生壳，复用全部 Web 代码。

### 技术选型

- **Capacitor 6**（兼容 Node 20，最新 6.2.1）
- 同时支持 Android 和 iOS（本期只做 Android）
- Web 代码 100% 复用，无需重写

### 前置条件

- [x] Node.js 20（v20.19.5，使用 Capacitor 6 兼容 Node 20）
- [x] Android Studio 已安装，SDK API 36 + Build-Tools 36 已配置

### 注意事项

- `@capacitor/core`、`@capacitor/cli`、`@capacitor/android` 三个包版本必须一致
- Android 项目目录 `frontend/android/` 会自动生成
- 开发时可通过 Live Reload 连接本地 Vite 开发服务器调试

---

## 实施步骤

### 步骤 1：环境准备与 Capacitor 安装 ✅

1. [x] 确认 Android Studio 已安装，SDK Platform API 36 和 Build-Tools 已下载
2. [x] 在 `frontend/` 目录安装 Capacitor 6 核心依赖（Capacitor 8 要求 Node 22+，降级为 6）：
   - `pnpm add @capacitor/core@6`
   - `pnpm add -D @capacitor/cli@6`
3. [x] 初始化 Capacitor 配置：`npx cap init`
   - appId: `com.familyhealth.app`
   - appName: `家庭健康管理`
   - webDir: `dist`
4. [x] 编辑 `capacitor.config.ts`，配置关键参数：
   - `server.androidScheme: 'https'`
   - `android.webContentsDebuggingEnabled: true`（调试用）
5. [x] 安装 Android 平台：
   - `pnpm add @capacitor/android@6`
   - `npx cap add android`
6. [x] 验证 `frontend/android/` 目录已生成

### 步骤 2：基础构建与运行验证 ✅

1. [x] 执行 `pnpm run build` 构建 Web 资源
2. [x] 执行 `npx cap sync android` 同步到 Android 项目
3. [x] 通过 Gradle 命令行构建 Debug APK（`./gradlew assembleDebug`）
4. [x] 在真机上安装 APK，验证基础页面加载正常（登录页可正常显示）
5. [x] 验证 API 请求能正确到达后端服务
6. [x] 验证路由跳转正常（SPA 路由兼容性）

### 步骤 3：API 网络配置与认证适配 ✅

1. [x] 分析当前 API 请求方式（Axios baseURL、Vite 代理）
2. [x] App 内不走 Vite 代理，需要直接请求后端地址：
   - 新增 `src/lib/capacitor.ts` 平台检测工具
   - 新增环境变量 `VITE_CAPACITOR_API_URL` 指向完整后端地址
   - API client 根据平台自动选择 baseURL
3. [x] Google OAuth 适配：使用 `@capacitor/browser` 内置浏览器 + Deep Link 回调
   - 安装 `@capacitor/app`、`@capacitor/browser` 插件
   - 配置 `com.familyhealth.app://` 自定义 URL scheme
   - `AndroidManifest.xml` 添加 deep link intent filter
   - `App.tsx` 添加 `DeepLinkHandler` 监听 OAuth 回调
4. [x] 处理 CORS 配置：后端 `CORS_ORIGIN` 添加 `https://localhost`
5. [x] Supabase 配置：Redirect URLs 添加 `com.familyhealth.app://auth/callback`
6. [x] 邮箱验证码登录验证通过
7. [x] Google OAuth 登录验证通过
8. [x] 首个 Beta APK 通过 GitHub Release 发布（v1.1.0）

### 步骤 3.5：App 动态服务器配置 ✅

1. [x] 后端添加 `GET /api/v1/config/public` 公开端点（返回 authRequired）
2. [x] 前端新增 `serverConfig.ts` 服务器配置存储模块
3. [x] 修改 `capacitor.ts` — `getApiBaseUrl()` 从 localStorage 读取
4. [x] 修改 `supabase.ts` — 新增 `getIsAuthEnabled()` 动态认证检查
5. [x] 修改 `client.ts` — 使用动态认证检查，新增 `updateApiBaseUrl()`
6. [x] 所有组件从 `isAuthEnabled` 迁移到 `getIsAuthEnabled()`
7. [x] 新增 `ServerSetup` 页面 — 首次启动配置服务器地址
8. [x] 修改 `App.tsx` — Capacitor 未配置时显示 ServerSetup
9. [x] 修改 Settings 页面 — App 环境下新增"服务器配置" Tab

### 步骤 4：App 图标与启动画面

1. [ ] 设计/准备 App 图标（至少 1024x1024 源图）
2. [ ] 安装 `@capacitor/splash-screen` 插件
3. [ ] 配置启动画面（Logo + 应用名称）
4. [ ] 生成 Android 各分辨率的图标资源（mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi）
5. [ ] 替换 Android 项目中的默认图标和启动画面

### 步骤 5：核心原生插件集成

1. [x] `@capacitor/app` — 应用生命周期管理（已安装，用于 deep link）
2. [x] `@capacitor/browser` — 内置浏览器（已安装，用于 OAuth）
3. [ ] `@capacitor/status-bar` — 状态栏样式适配（颜色与主题同步）
4. [ ] `@capacitor/network` — 网络状态监听，断网时给用户提示
5. [ ] `@capacitor/preferences` — 本地存储（替代 localStorage 在原生环境下的不稳定性）
6. [ ] `@capacitor/camera`（可选）— 拍照上传健康文档
7. [ ] `@capacitor/text-zoom` — 文字缩放支持，尊重系统无障碍设置

### 步骤 6：Android 返回键与导航适配

1. [ ] 监听 Android 硬件返回键，映射到 React Router 的 `navigate(-1)`
2. [ ] 在首页按返回键时，弹出"确认退出"对话框而非直接退出
3. [ ] 深层页面的返回行为测试（详情页 → 列表页 → 首页）

### 步骤 7：UI 适老化优化

1. [ ] **字体大小调整**：
   - 全局基础字号从 14px 提升到 16px（App 模式下）
   - 重要信息（血压值、体温等）使用更大字号
   - 按钮文字不小于 16px
2. [ ] **触控区域优化**：
   - 所有可点击元素最小 48x48dp
   - 增大列表项间距，减少误触
   - 底部导航栏按钮加大
3. [ ] **视觉优化**：
   - 提高色彩对比度
   - 重要操作按钮更显眼（颜色、大小）
   - 图标配合文字标签，不使用纯图标按钮
4. [ ] **交互简化**：
   - 考虑 App 模式下简化导航层级
   - 常用功能放在首屏直达
   - 减少需要输入的场景

### 步骤 8：构建与打包

1. [ ] 配置 APK 签名密钥（生成 keystore）
2. [ ] 配置 Gradle 签名信息
3. [ ] 执行 Release 构建：`./gradlew assembleRelease`
4. [ ] 测试 Release APK 在真机上的安装和运行
5. [ ] 记录 APK 文件大小，评估是否需要优化

### 步骤 9：开发工作流配置

1. [ ] 在 `package.json` 中添加便捷脚本：
   - `"cap:sync": "cap sync android"`
   - `"cap:open": "cap open android"`
   - `"cap:build": "pnpm build && cap sync android"`
2. [ ] 配置 Live Reload 开发模式（连接本地 Vite 服务器）
3. [ ] 更新 `.gitignore`，排除 Android 构建产物但保留项目配置
4. [ ] 更新项目 README，添加 App 构建说明

---

## 可选后续工作（本期不做，记录备忘）

- [ ] 推送通知集成（需要 Firebase 配置）
- [ ] 本地通知（用药提醒、测量提醒）
- [ ] 离线模式支持（Service Worker + 本地缓存）
- [ ] iOS 平台支持
- [ ] 应用商店上架（Google Play）
- [ ] 自动更新机制
- [ ] 生物识别登录（指纹/面部）

---

## 参考资料

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Capacitor + React 集成指南](https://capacitorjs.com/solution/react)
- [Capacitor 官方插件列表](https://capacitorjs.com/docs/apis)
