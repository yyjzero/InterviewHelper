#!/bin/bash

# Vercel 自动部署脚本
echo "🚀 开始部署到 Vercel..."

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ 未安装 Vercel CLI，正在安装..."
    npm install -g vercel
fi

# 检查是否已登录 Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 请先登录 Vercel..."
    vercel login
fi

# 部署到 Vercel
echo "📦 正在部署..."
vercel --prod

echo "✅ 部署完成！"
echo "🌐 您的应用已部署到 Vercel"
echo "💡 每次推送代码到 main 分支都会自动重新部署"
