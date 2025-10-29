import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '面试助手 - AI 智能面试题目生成',
  description: '基于 AI 的智能面试题目生成工具，支持简历和岗位描述分析',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">{children}</body>
    </html>
  )
}
