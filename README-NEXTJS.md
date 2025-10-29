# 面试助手 - Next.js 版本

## 🚀 项目已成功迁移到 Next.js

这个项目已经从 React + Vite 成功迁移到 Next.js 14，具有以下优势：

### ✨ 新特性
- **App Router**: 使用 Next.js 13+ 的新 App Router 架构
- **API Routes**: 内置 API 路由，无需单独的后端服务
- **服务端渲染**: 更好的 SEO 和性能
- **自动优化**: 自动代码分割、图片优化等
- **TypeScript**: 完整的 TypeScript 支持

### 📁 项目结构
```
├── app/
│   ├── api/ocr/          # OCR API 路由
│   ├── globals.css       # 全局样式
│   ├── layout.tsx        # 根布局
│   └── page.tsx          # 主页面
├── public/               # 静态资源
│   └── pdf.worker.min.mjs
├── next.config.js        # Next.js 配置
├── tailwind.config.js    # Tailwind 配置
└── tsconfig.json         # TypeScript 配置
```

### 🛠️ 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

### 🔧 环境变量

在 `.env.local` 中配置：
```env
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key
NEXT_PUBLIC_TENCENT_SECRET_ID=your_tencent_secret_id
NEXT_PUBLIC_TENCENT_SECRET_KEY=your_tencent_secret_key
```

### 🌐 访问地址
- 开发环境: http://localhost:3000
- 生产环境: 部署后自动生成

### 📦 部署

#### Vercel 部署
1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 自动部署

#### 其他平台
- 支持任何支持 Node.js 的平台
- 使用 `npm run build` 构建
- 使用 `npm start` 启动

### 🔄 主要变化

1. **文件结构**: 从 `src/` 迁移到 `app/`
2. **API 路由**: OCR 服务现在在 `/api/ocr`
3. **环境变量**: 使用 `NEXT_PUBLIC_` 前缀
4. **样式**: 全局样式在 `app/globals.css`
5. **配置**: 简化的配置文件

### 🎯 功能保持不变
- PDF 简历解析
- 图片 OCR 识别
- AI 面试题目生成
- 响应式设计
- 现代化 UI

项目已完全迁移到 Next.js，享受更好的开发体验和性能！
