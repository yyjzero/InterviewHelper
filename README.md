# InterviewHelper - 面试助手应用

一个基于 React + TypeScript + Vite 构建的智能面试准备工具，使用 AI 技术生成个性化的面试题目和建议答案。

## ✨ 功能特性

- **📄 简历上传**：支持 PDF、Word、图片格式，自动 OCR 识别文字内容
- **📋 岗位描述输入**：可粘贴文本或上传图片进行 OCR 识别
- **🤖 AI 驱动的面试题目生成**：
  - 集成 OpenRouter Gemini 2.5 Flash 模型
  - 根据简历和岗位描述生成个性化面试题目
  - 题目类型包括：过往项目经验、核心技能、学习能力、公司业务、综合类
- **🎯 个性化建议答案**：结合候选人背景，站在用人方角度提供实用建议
- **🔄 动态加载效果**：生成过程中显示"正在思考..."状态
- **📱 响应式设计**：使用 Tailwind CSS 构建现代化界面

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/yyjzero/InterviewHelper.git
cd InterviewHelper
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
创建 `.env.local` 文件：
```env
# OpenRouter API 配置
VITE_OPENROUTER_API_KEY=your_openrouter_api_key

# 腾讯云 OCR API 配置
VITE_TENCENT_SECRET_ID=your_tencent_secret_id
VITE_TENCENT_SECRET_KEY=your_tencent_secret_key
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:5173` 查看应用。

## 🔧 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式框架**：Tailwind CSS
- **图标库**：Lucide React
- **AI 模型**：OpenRouter Gemini 2.5 Flash
- **OCR 服务**：腾讯云 OCR API
- **PDF 处理**：PDF.js

## 📁 项目结构

```
InterviewHelper/
├── src/
│   ├── App.tsx          # 主应用组件
│   └── main.tsx         # 应用入口
├── public/              # 静态资源
├── package.json         # 项目配置
├── vite.config.ts       # Vite 配置
├── tailwind.config.js   # Tailwind 配置
└── README.md           # 项目说明
```

## 🛠️ 开发说明

### API 配置

1. **OpenRouter API**：
   - 访问 [OpenRouter](https://openrouter.ai/) 注册账号
   - 获取 API 密钥并配置到环境变量

2. **腾讯云 OCR API**：
   - 访问 [腾讯云控制台](https://console.cloud.tencent.com/cam/capi)
   - 创建 API 密钥并添加 OCR 服务权限
   - 配置 SecretId 和 SecretKey

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🚀 Vercel 自动部署

### 方法一：Vercel CLI（推荐）
1. 安装 Vercel CLI：
   ```bash
   npm i -g vercel
   ```

2. 在项目根目录运行：
   ```bash
   vercel
   ```

3. 按照提示完成配置，选择：
   - 项目根目录：`./`
   - 构建命令：`npm run build`
   - 输出目录：`dist`

4. 每次推送代码到 main 分支会自动部署

### 方法二：GitHub Actions（已配置）
1. 在 Vercel 控制台获取以下信息：
   - Vercel Token（Settings → Tokens）
   - Organization ID（Settings → General）
   - Project ID（项目设置 → General）

2. 在 GitHub 仓库设置中添加 Secrets：
   - `VERCEL_TOKEN`：你的 Vercel Token
   - `ORG_ID`：你的 Organization ID
   - `PROJECT_ID`：你的 Project ID

3. 推送代码到 main 分支即可自动部署

### 环境变量配置
在 Vercel 控制台的项目设置中添加环境变量：
- `VITE_OPENROUTER_API_KEY`：OpenRouter API 密钥
- `TENCENT_SECRET_ID`：腾讯云 SecretId
- `TENCENT_SECRET_KEY`：腾讯云 SecretKey

**注意**：Vercel 环境变量不需要 `VITE_` 前缀，直接使用变量名即可。

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**：本项目仅用于学习和演示目的，请确保遵守相关 API 服务的使用条款。
