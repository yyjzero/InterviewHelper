# 🚀 自动部署设置指南

## 📋 前置要求

1. **GitHub 仓库**：确保代码已推送到 GitHub
2. **Vercel 账户**：注册并登录 [Vercel](https://vercel.com)
3. **Node.js 18+**：确保本地环境支持

## 🔧 配置步骤

### 1. 获取 Vercel 信息

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 链接项目（在项目根目录运行）
vercel link
```

记录下输出的 `ORG_ID` 和 `PROJECT_ID`。

### 2. 获取 Vercel Token

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入 Settings → Tokens
3. 创建新的 Token，记录下 `VERCEL_TOKEN`

### 3. 配置 GitHub Secrets

1. 进入 GitHub 仓库
2. 点击 Settings → Secrets and variables → Actions
3. 添加以下 Secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `VERCEL_TOKEN` | 你的 Vercel Token | 从 Vercel Dashboard 获取 |
| `ORG_ID` | 你的 Organization ID | 从 `vercel link` 命令获取 |
| `PROJECT_ID` | 你的 Project ID | 从 `vercel link` 命令获取 |

### 4. 配置 Vercel 环境变量

在 Vercel Dashboard 的项目设置中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_OPENROUTER_API_KEY` | 你的 OpenRouter API Key | 用于 AI 聊天功能 |
| `NEXT_PUBLIC_TENCENT_SECRET_ID` | 你的腾讯云 SecretId | 用于 OCR 功能 |
| `NEXT_PUBLIC_TENCENT_SECRET_KEY` | 你的腾讯云 SecretKey | 用于 OCR 功能 |
| `TENCENT_SECRET_ID` | 你的腾讯云 SecretId | 服务端 OCR 功能 |
| `TENCENT_SECRET_KEY` | 你的腾讯云 SecretKey | 服务端 OCR 功能 |

## 🚀 部署流程

### 自动部署（推荐）

1. **推送代码到 main 分支**：
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   git push origin main
   ```

2. **GitHub Actions 自动执行**：
   - ✅ TypeScript 类型检查
   - ✅ ESLint 代码规范检查
   - ✅ Next.js 项目构建
   - ✅ 自动部署到 Vercel

3. **查看部署状态**：
   - GitHub Actions 页面查看构建日志
   - Vercel Dashboard 查看部署详情

### 手动部署

```bash
# 使用部署脚本
chmod +x deploy.sh
./deploy.sh

# 或直接使用 Vercel CLI
vercel --prod
```

## 🔍 故障排除

### 常见问题

1. **GitHub Actions 失败**
   - 检查 Secrets 配置是否正确
   - 查看 Actions 日志了解具体错误

2. **Vercel 部署失败**
   - 检查环境变量是否配置完整
   - 查看 Vercel 构建日志

3. **PDF 功能不工作**
   - 确保 PDF worker 路径配置正确
   - 检查 CDN 访问是否正常

### 调试命令

```bash
# 检查本地构建
npm run build

# 检查类型
npm run typecheck

# 检查代码规范
npm run lint

# 本地预览
npm run dev
```

## 📊 监控和维护

1. **部署状态**：在 GitHub Actions 页面监控
2. **应用性能**：在 Vercel Dashboard 查看
3. **错误日志**：在 Vercel 函数日志中查看
4. **访问统计**：在 Vercel Analytics 中查看

## 🎯 最佳实践

1. **分支策略**：
   - `main` 分支：生产环境
   - `develop` 分支：开发环境
   - 功能分支：`feature/功能名`

2. **提交规范**：
   - `feat:` 新功能
   - `fix:` 修复问题
   - `docs:` 文档更新
   - `style:` 代码格式
   - `refactor:` 重构

3. **测试**：
   - 本地测试通过后再推送
   - 使用 Pull Request 进行代码审查

---

🎉 **配置完成后，每次推送代码到 main 分支都会自动部署到 Vercel！**
