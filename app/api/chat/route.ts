import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messages, model, max_tokens, temperature } = await request.json()
    
    console.log('收到聊天请求:', { model, messagesCount: messages.length })
    
    // 优先使用服务端密钥，避免使用暴露在前端的变量
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
    if (!apiKey) {
      console.error('API 密钥未配置')
      return NextResponse.json({ error: 'API 密钥未配置' }, { status: 500 })
    }
    
    console.log('API Key 前10位:', apiKey.substring(0, 10))

    // 计算 Referer，OpenRouter 需要匹配在集成设置中允许的域名
    const reqOrigin = request.headers.get('origin')
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
    const referer = reqOrigin || vercelUrl || 'http://localhost:3000'

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': referer,
        'X-Title': 'Interview Helper'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature
      })
    })

    console.log('OpenRouter 响应状态:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API 错误:', errorText)
      return NextResponse.json({ error: `API 请求失败: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('聊天 API 处理错误:', error)
    return NextResponse.json({ error: '聊天 API 处理失败' }, { status: 500 })
  }
}
