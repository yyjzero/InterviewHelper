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

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**：本项目仅用于学习和演示目的，请确保遵守相关 API 服务的使用条款。
