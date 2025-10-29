import { NextRequest, NextResponse } from 'next/server'
import * as tencentcloud from 'tencentcloud-sdk-nodejs'

const { ocr } = tencentcloud
const { Client: OcrClient } = ocr.v20181119

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()
    
    if (!image) {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 })
    }

    const secretId = process.env.TENCENT_SECRET_ID
    const secretKey = process.env.TENCENT_SECRET_KEY

    if (!secretId || !secretKey) {
      return NextResponse.json({ error: 'OCR 服务配置错误' }, { status: 500 })
    }

    const client = new OcrClient({
      credential: {
        secretId: secretId,
        secretKey: secretKey,
      },
      region: 'ap-beijing',
    })

    const params = {
      ImageBase64: image,
      Scene: 'doc',
      LanguageType: 'zh'
    }

    const response = await client.GeneralBasicOCR(params)
    
    if (response.TextDetections && response.TextDetections.length > 0) {
      const text = response.TextDetections
        .map((item: any) => item.DetectedText)
        .join('\n')
      
      return NextResponse.json({ text })
    } else {
      return NextResponse.json({ text: '' })
    }
  } catch (error) {
    console.error('OCR 处理错误:', error)
    return NextResponse.json(
      { error: 'OCR 处理失败' }, 
      { status: 500 }
    )
  }
}
