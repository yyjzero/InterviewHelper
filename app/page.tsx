'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, Camera, Sparkles, Download } from 'lucide-react'

// 动态导入 pdfjs-dist 以避免 SSR 问题
let pdfjs: any

export default function Home() {
  const [resumeContent, setResumeContent] = useState<string>('')
  const [jobDescription, setJobDescription] = useState<string>('')
  const [jobDescContent, setJobDescContent] = useState<string>('')
  const [questions, setQuestions] = useState<string[]>([])
  const [qaPairs, setQaPairs] = useState<Array<{question: string, answer: string}>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [resumeUploadSuccess, setResumeUploadSuccess] = useState(false)
  const [jobDescUploadSuccess, setJobDescUploadSuccess] = useState(false)

  // 动态加载 pdfjs-dist
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjs = pdfjsLib
        
        // 设置 worker - 使用CDN路径以确保在Vercel上正常工作
        // 使用固定版本号确保稳定性
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`
        
        // 等待一小段时间确保worker完全初始化
        await new Promise(resolve => setTimeout(resolve, 100))
        
        setPdfLoaded(true)
        console.log('PDF库加载完成')
      } catch (error) {
        console.error('Failed to load pdfjs-dist:', error)
        setPdfLoaded(false)
      }
    }
    
    loadPdf()
  }, [])

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查PDF库是否已加载
    if (!pdfLoaded || !pdfjs) {
      alert('PDF库正在加载中，请稍候再试')
      return
    }

    try {
      const text = await extractTextFromPDF(file)
      setResumeContent(text)
      setResumeUploadSuccess(true)
      
      // 3秒后隐藏成功状态
      setTimeout(() => {
        setResumeUploadSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('读取简历内容失败:', error)
      alert('读取简历内容失败，请手动输入')
    }
  }

  const handleJobDescImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64Image = reader.result as string
      try {
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64Image }),
        })

        if (!response.ok) {
          throw new Error(`OCR API request failed: ${response.status}`)
        }

        const data = await response.json()
        setJobDescription(data.text)
        setJobDescContent(data.text)
        setJobDescUploadSuccess(true)
        
        // 3秒后隐藏成功状态
        setTimeout(() => {
          setJobDescUploadSuccess(false)
        }, 3000)
      } catch (error) {
        console.error('OCR 处理错误:', error)
        alert('OCR 服务不可用或处理失败，请手动输入内容')
      }
    }
    reader.readAsDataURL(file)
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    if (!pdfjs) {
      throw new Error('PDF库尚未加载完成，请稍候再试')
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument(arrayBuffer).promise
      let fullText = ''
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        fullText += pageText + '\n'
      }
      
      return fullText.trim()
    } catch (error) {
      console.error('PDF解析错误:', error)
      throw new Error('PDF文件解析失败，请确保文件格式正确')
    }
  }

  const generateQuestions = async () => {
    const currentJobDesc = jobDescContent || jobDescription
    console.log('简历内容长度:', resumeContent.trim().length)
    console.log('岗位描述长度:', currentJobDesc.trim().length)
    
    if (!resumeContent.trim() || !currentJobDesc.trim()) {
      alert('请先输入简历内容和岗位描述')
      return
    }

    setIsLoading(true)
    try {
      console.log('请求模型:', 'google/gemini-2.5-flash')
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的面试官，请根据简历和岗位描述生成10个高质量的面试题目和参考答案。\n\n要求：\n1. 必须生成10个问题，不能多也不能少\n2. 问题分类：\n   - 3个问题针对简历中的项目和工作经历进行具体提问\n   - 1个问题针对岗位技能或业务匹配性进行提问\n   - 6个问题涵盖技术能力、问题解决能力、团队协作、沟通能力等方面，需根据简历和岗位要求进行综合提问\n3. 每个问题都要结合具体的简历内容和岗位要求，具有针对性\n4. 每个问题都必须提供参考答案\n5. 参考答案要站在用人方的角度，帮助面试官评估候选人\n6. 答案要简洁，罗列3-5条核心思路即可\n7. 不要使用任何格式符号如*、-、#等，直接输出纯文本\n8. 答案格式：用1.2.3.等数字编号，每个编号对应一个核心思路\n\n输出格式：\n问题1：[具体问题内容]\n参考答案：\n1. [核心思路1]\n2. [核心思路2]\n3. [核心思路3]\n\n问题2：[具体问题内容]\n参考答案：\n1. [核心思路1]\n2. [核心思路2]\n\n...以此类推，共10个问题'
            },
            {
              role: 'user',
              content: `简历内容：\n${resumeContent}\n\n岗位描述：\n${currentJobDesc}\n\n请生成10个面试题目：`
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      })

      console.log('响应状态:', response.status)
      console.log('响应头:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API 错误响应:', errorText)
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('API 响应数据:', data)
      
      const content = data.choices[0]?.message?.content || ''
      
      // 解析问题和答案 - 使用新的格式解析
      console.log('原始内容:', content)
      
      const qaPairs: Array<{question: string, answer: string}> = []
      
      // 按"问题"分割内容
      const sections = content.split(/问题\d+：/)
      
      for (let i = 1; i < sections.length; i++) { // 从1开始，跳过第一个空部分
        const section = sections[i].trim()
        if (!section) continue
        
        // 按"参考答案："分割问题和答案
        const parts = section.split('参考答案：')
        if (parts.length >= 2) {
          const question = parts[0].trim()
          const answer = parts[1].trim()
          
          qaPairs.push({
            question: question,
            answer: answer
          })
        }
      }
      
      console.log('解析后的问题数量:', qaPairs.length)
      console.log('解析后的问题:', qaPairs.map((qa, index) => ({ 
        index: index + 1, 
        question: qa.question.substring(0, 50) + '...', 
        hasAnswer: !!qa.answer 
      })))
      
      // 如果问题数量不足10个，添加默认问题
      while (qaPairs.length < 10) {
        qaPairs.push({
          question: `请详细描述您在相关领域的经验和能力`,
          answer: '1. 此问题需要根据具体情况进行回答，建议结合个人经验和项目实践来阐述\n2. 可以从技术实现、问题解决思路、团队协作等角度来回答\n3. 重点突出个人在该领域的专业能力和学习成长'
        })
      }
      
      // 确保每个问题都有答案
      qaPairs.forEach((qa, index) => {
        if (!qa.answer || qa.answer.trim() === '') {
          qa.answer = '1. 此问题需要根据具体情况进行回答，建议结合个人经验和项目实践来阐述\n2. 可以从技术实现、问题解决思路、团队协作等角度来回答\n3. 重点突出个人在该领域的专业能力和学习成长'
        }
      })
      
      setQaPairs(qaPairs)
      setQuestions(qaPairs.map(qa => qa.question))
    } catch (error) {
      console.error('生成题目失败:', error)
      alert(`生成题目失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAnswer = (answer: string): string[] => {
    return answer.split('\n').filter(line => line.trim())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* 世界级背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 主要渐变球体 */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-violet-500/30 via-purple-500/20 to-fuchsia-500/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-500/30 via-blue-500/20 to-indigo-500/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-tl from-emerald-500/25 via-teal-500/15 to-cyan-500/25 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-rose-500/25 via-pink-500/15 to-violet-500/25 rounded-full blur-3xl"></div>
        
        {/* 微妙的网格背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* 动态光效 */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-gradient-to-r from-pink-400/10 to-rose-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* 世界级头部设计 */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-3xl blur-xl"></div>
              <div className="relative p-6 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20">
                <FileText className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent mb-6 tracking-tight">
            AI 面试助手
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            基于 AI 的智能面试题目生成工具，分析简历和岗位描述，为您量身定制专业面试题目
          </p>
        </div>

               {/* 主要内容区域 */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                 {/* 岗位描述区域 */}
                 <div className="relative group">
                   <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                   <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 group-hover:border-white/30 transition-all duration-500">
                     <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                       <div className="p-2 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl mr-3">
                         <Camera className="w-6 h-6 text-white" />
                       </div>
                       岗位描述
                     </h2>
              
                     <div className="mb-6">
                       <label className="block mb-3">
                         <input
                           type="file"
                           accept="image/*"
                           onChange={handleJobDescImageUpload}
                           className="hidden"
                           id="job-desc-upload"
                         />
                         <div className={`relative flex items-center justify-center w-full h-20 border-2 border-dashed rounded-2xl transition-all duration-500 group/upload ${
                           'border-orange-400/80 cursor-pointer hover:border-orange-300 hover:bg-orange-400/20 hover:shadow-lg hover:shadow-orange-400/30 hover:scale-[1.02]'
                         } ${jobDescUploadSuccess ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20' : ''}`}>
                           {/* 背景光效 */}
                           <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
                             !jobDescUploadSuccess 
                               ? 'bg-gradient-to-r from-orange-400/15 to-yellow-400/15 opacity-0 group-hover/upload:opacity-100' 
                               : 'bg-gradient-to-r from-emerald-500/20 to-green-500/20' 
                           }`}></div>
                           
                           {/* 脉冲边框效果 */}
                           <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
                             !jobDescUploadSuccess 
                               ? 'border-2 border-orange-400/40 opacity-0 group-hover/upload:opacity-100 animate-pulse' 
                               : 'border-2 border-emerald-400/60 animate-pulse' 
                           }`}></div>
                           
                           <div className="relative flex items-center">
                             <div className={`p-3 rounded-xl mr-4 group-hover/upload:scale-110 transition-all duration-300 ${
                               jobDescUploadSuccess
                                 ? 'bg-gradient-to-r from-emerald-500/30 to-green-500/30'
                                 : 'bg-gradient-to-r from-orange-400/30 to-yellow-400/30'
                             }`}>
                               {jobDescUploadSuccess ? (
                                 <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                 </svg>
                               ) : (
                                 <Camera className="w-6 h-6 text-orange-300" />
                               )}
                             </div>
                             <div className="text-center">
                               <div className={`text-lg font-bold mb-1 ${
                                 jobDescUploadSuccess 
                                   ? 'text-emerald-300' 
                                   : 'text-orange-200'
                               }`}>
                                 {jobDescUploadSuccess ? '上传成功！' : '点击上传岗位描述图片'}
                               </div>
                               <div className={`text-sm ${
                                 jobDescUploadSuccess 
                                   ? 'text-emerald-400' 
                                   : 'text-orange-300'
                               }`}>
                                 {jobDescUploadSuccess ? '内容已自动识别' : '支持 JPG、PNG 等图片格式'}
                               </div>
                             </div>
                           </div>
                         </div>
                       </label>
                     </div>

                     <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 min-h-[200px] border border-white/10">
                       <div className="text-sm font-medium text-gray-300 mb-3">岗位描述内容：</div>
                       <textarea
                         value={jobDescContent || jobDescription}
                         onChange={(e) => {
                           setJobDescription(e.target.value)
                           setJobDescContent(e.target.value)
                         }}
                         placeholder="请粘贴或输入岗位描述内容..."
                         className="w-full h-40 px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:outline-none focus:border-rose-400/50 focus:ring-4 focus:ring-rose-400/20 resize-none text-white placeholder-gray-400 transition-all duration-300"
                         suppressHydrationWarning={true}
                       />
                     </div>
                   </div>
                 </div>

                 {/* 简历上传区域 */}
                 <div className="relative group">
                   <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                   <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 group-hover:border-white/30 transition-all duration-500">
                     <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                       <div className="p-2 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl mr-3">
                         <FileText className="w-6 h-6 text-white" />
                       </div>
                       简历内容
                     </h2>
              
                     <div className="mb-6">
                       <label className="block mb-3">
                         <input
                           type="file"
                           accept=".pdf"
                           onChange={handleResumeUpload}
                           className="hidden"
                           id="resume-upload"
                           disabled={!pdfLoaded}
                         />
                         <div className={`relative flex items-center justify-center w-full h-20 border-2 border-dashed rounded-2xl transition-all duration-500 group/upload ${
                           pdfLoaded 
                             ? 'border-cyan-400/80 cursor-pointer hover:border-cyan-300 hover:bg-cyan-400/20 hover:shadow-lg hover:shadow-cyan-400/30 hover:scale-[1.02]' 
                             : 'border-gray-500/30 cursor-not-allowed opacity-50'
                         } ${resumeUploadSuccess ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20' : ''}`}>
                           {/* 背景光效 */}
                           <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
                             pdfLoaded && !resumeUploadSuccess 
                               ? 'bg-gradient-to-r from-cyan-400/15 to-blue-400/15 opacity-0 group-hover/upload:opacity-100' 
                               : resumeUploadSuccess 
                                 ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20' 
                                 : ''
                           }`}></div>
                           
                           {/* 脉冲边框效果 */}
                           <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
                             pdfLoaded && !resumeUploadSuccess 
                               ? 'border-2 border-cyan-400/40 opacity-0 group-hover/upload:opacity-100 animate-pulse' 
                               : resumeUploadSuccess 
                                 ? 'border-2 border-emerald-400/60 animate-pulse' 
                                 : ''
                           }`}></div>
                           
                           <div className="relative flex items-center">
                             <div className={`p-3 rounded-xl mr-4 group-hover/upload:scale-110 transition-all duration-300 ${
                               pdfLoaded 
                                 ? resumeUploadSuccess
                                   ? 'bg-gradient-to-r from-emerald-500/30 to-green-500/30'
                                   : 'bg-gradient-to-r from-cyan-400/30 to-blue-400/30'
                                 : 'bg-gray-500/20'
                             }`}>
                               {resumeUploadSuccess ? (
                                 <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                 </svg>
                               ) : (
                                 <Upload className={`w-6 h-6 ${pdfLoaded ? 'text-cyan-300' : 'text-gray-500'}`} />
                               )}
                             </div>
                             <div className="text-center">
                               <div className={`text-lg font-bold mb-1 ${
                                 pdfLoaded 
                                   ? resumeUploadSuccess 
                                     ? 'text-emerald-300' 
                                     : 'text-cyan-200'
                                   : 'text-gray-500'
                               }`}>
                                 {resumeUploadSuccess ? '上传成功！' : pdfLoaded ? '点击上传 PDF 简历' : 'PDF 库加载中...'}
                               </div>
                               <div className={`text-sm ${
                                 pdfLoaded 
                                   ? resumeUploadSuccess 
                                     ? 'text-emerald-400' 
                                     : 'text-cyan-300'
                                   : 'text-gray-500'
                               }`}>
                                 {resumeUploadSuccess ? '简历内容已自动识别' : pdfLoaded ? '支持 PDF 格式文件' : '请稍候...'}
                               </div>
                             </div>
                           </div>
                         </div>
                       </label>
                     </div>

                     <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 min-h-[200px] border border-white/10">
                       <div className="text-sm font-medium text-gray-300 mb-3">识别到的简历内容：</div>
                       <textarea
                         value={resumeContent}
                         onChange={(e) => setResumeContent(e.target.value)}
                         placeholder="识别到的简历内容将显示在这里，您也可以手动编辑..."
                         className="w-full h-40 px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl focus:outline-none focus:border-violet-400/50 focus:ring-4 focus:ring-violet-400/20 resize-none text-white placeholder-gray-400 transition-all duration-300"
                         suppressHydrationWarning={true}
                       />
                     </div>
                   </div>
                 </div>
               </div>

               {/* 世界级生成按钮 */}
               <div className="text-center mb-16">
                 <div className="relative inline-block">
                   {/* 多层光效背景 */}
                   <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-cyan-500/30 rounded-3xl blur-xl"></div>
                   <div className={`absolute inset-0 rounded-3xl blur-lg transition-all duration-1000 ${
                     isLoading 
                       ? 'bg-gradient-to-r from-violet-400/40 to-cyan-400/40 animate-pulse' 
                       : 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20'
                   }`}></div>
                   
                   {/* 科幻扫描效果 */}
                   <div className={`absolute inset-0 rounded-3xl transition-all duration-1000 ${
                     isLoading 
                       ? 'opacity-100' 
                       : 'opacity-0'
                   }`} style={{ 
                     background: isLoading 
                       ? 'linear-gradient(45deg, transparent 30%, rgba(139, 92, 246, 0.4) 50%, transparent 70%)' 
                       : 'none',
                     animation: isLoading ? 'sci-fi-scan 2s ease-in-out infinite' : 'none'
                   }}></div>
                   
                   {/* 科幻粒子效果 */}
                   <div className={`absolute inset-0 rounded-3xl transition-all duration-1000 ${
                     isLoading 
                       ? 'opacity-100' 
                       : 'opacity-0'
                   }`} style={{ 
                     background: isLoading 
                       ? 'radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)' 
                       : 'none',
                     animation: isLoading ? 'sci-fi-particles 3s ease-in-out infinite' : 'none'
                   }}></div>
                   
                   <button
                     onClick={generateQuestions}
                     disabled={isLoading || !resumeContent.trim() || !(jobDescContent || jobDescription).trim()}
                     className={`relative px-16 py-6 rounded-3xl font-black text-xl transition-all duration-500 overflow-hidden ${
                       isLoading || !resumeContent.trim() || !(jobDescContent || jobDescription).trim()
                         ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 cursor-not-allowed opacity-70'
                         : 'bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 text-white hover:from-violet-500 hover:via-purple-500 hover:to-cyan-500 hover:shadow-2xl hover:scale-105 hover:shadow-violet-500/25'
                     }`}
                   >
                     {/* 按钮内部光效 */}
                     <div className={`absolute inset-0 rounded-3xl transition-all duration-500 ${
                       isLoading 
                         ? 'bg-gradient-to-r from-violet-400/20 to-cyan-400/20 animate-pulse' 
                         : (resumeContent.trim() && (jobDescContent || jobDescription).trim())
                           ? 'bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100'
                           : ''
                     }`}></div>
                     
                     {/* 科幻能量流动效果 */}
                     <div className={`absolute inset-0 rounded-3xl transition-all duration-1000 ${
                       isLoading 
                         ? 'opacity-100' 
                         : 'opacity-0'
                     }`} style={{
                       background: isLoading 
                         ? 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.3), transparent)' 
                         : 'none',
                       animation: isLoading ? 'sci-fi-flow 2.5s ease-in-out infinite' : 'none'
                     }}></div>
                     
                     
                     <div className="relative flex items-center">
                       {isLoading ? (
                         <>
                           <div className="relative mr-4">
                             <div className="w-8 h-8 border-2 border-violet-400/50 rounded-full animate-pulse"></div>
                             <div className="absolute inset-0 w-8 h-8 border-2 border-cyan-400/50 rounded-full animate-ping"></div>
                             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                           </div>
                           <div className="text-center">
                             <div className="text-lg font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                               AI 正在生成中...
                             </div>
                             <div className="text-sm opacity-80">请稍候，正在分析简历和岗位要求</div>
                           </div>
                         </>
                       ) : !resumeContent.trim() || !(jobDescContent || jobDescription).trim() ? (
                         <>
                           <div className="p-2 bg-gray-500/20 rounded-xl mr-4">
                             <Sparkles className="w-6 h-6 text-gray-400" />
                           </div>
                           <div className="text-center">
                             <div className="text-lg font-bold text-gray-400">请先上传简历和岗位描述</div>
                             <div className="text-sm text-gray-500">上传完成后即可生成面试题目</div>
                           </div>
                         </>
                       ) : (
                         <>
                           <div className="p-2 bg-white/20 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                             <Sparkles className="w-6 h-6" />
                           </div>
                           <div className="text-center">
                             <div className="text-lg font-bold">生成面试题目</div>
                             <div className="text-sm opacity-80">基于简历和岗位描述智能生成</div>
                           </div>
                         </>
                       )}
                     </div>
                   </button>
                 </div>
               </div>

        {/* 世界级面试题目展示区域 */}
        {qaPairs.length > 0 && (
          <div className="relative -mx-4 px-4 py-12">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 via-slate-700/30 to-slate-800/50 rounded-3xl"></div>
            <div className="relative max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h3 className="text-4xl font-black bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent mb-4">
                  为您量身定制的面试题目
                </h3>
                <p className="text-gray-300 text-lg">基于您的简历和岗位要求，AI 智能生成的专业面试题目</p>
              </div>
              <div className="grid gap-8">
                {qaPairs.map((qa, index) => (
                  <div
                    key={index}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 group-hover:border-white/30 transition-all duration-500">
                      {/* 问题部分 */}
                      <div className="mb-8">
                        <div className="flex items-start mb-6">
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-black text-lg mr-6 shadow-lg">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-white mb-3">问题：</h4>
                            <p className="text-gray-200 leading-relaxed text-lg">{qa.question}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* 答案部分 */}
                      <div className="bg-gradient-to-r from-violet-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                        <h5 className="text-lg font-bold text-violet-200 mb-6 flex items-center">
                          <div className="w-2 h-2 bg-violet-400 rounded-full mr-3"></div>
                          参考答案：
                        </h5>
                        <div className="text-gray-200 leading-relaxed space-y-4">
                          {qa.answer.split('\n').map((line, lineIndex) => {
                            const trimmedLine = line.trim()
                            if (!trimmedLine) return null
                            
                            // 检查是否是主要要点（以数字开头，如 1. 2. 3.）
                            const isMainPoint = /^\d+\.\s/.test(trimmedLine)
                            
                            if (isMainPoint) {
                              // 使用原始编号，不重新编号
                              const originalNumber = trimmedLine.match(/^\d+\./)?.[0]
                              return (
                                <div key={lineIndex} className="flex items-start">
                                  <span className="text-xl font-bold text-violet-300 mr-4 mt-1 flex-shrink-0">
                                    {originalNumber}
                                  </span>
                                  <span className="flex-1 text-gray-100 leading-relaxed text-lg">
                                    {trimmedLine.replace(/^\d+\.\s*/, '')}
                                  </span>
                                </div>
                              )
                            } else {
                              // 普通文本，作为补充说明
                              return (
                                <div key={lineIndex} className="ml-10 text-gray-300 leading-relaxed text-base">
                                  {trimmedLine}
                                </div>
                              )
                            }
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-12">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-2xl blur-xl"></div>
                  <button
                    onClick={() => {
                      const content = qaPairs.map((qa, i) => {
                        const answerLines = qa.answer.split('\n').map((line, lineIndex) => {
                          const trimmedLine = line.trim()
                          if (!trimmedLine) return ''
                          
                          // 检查是否是主要要点（以数字开头，如 1. 2. 3.）
                          const isMainPoint = /^\d+\.\s/.test(trimmedLine)
                          
                          if (isMainPoint) {
                            // 保持原始编号
                            return trimmedLine
                          } else {
                            // 普通文本，添加缩进
                            return `    ${trimmedLine}`
                          }
                        }).filter(line => line)
                        
                        return `问题：${qa.question}\n\n参考答案：\n${answerLines.join('\n')}`
                      }).join('\n\n' + '='.repeat(50) + '\n\n')
                      
                      const blob = new Blob([content], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = '面试题目和答案.txt'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="relative px-10 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-2xl font-bold text-lg hover:from-emerald-500 hover:to-cyan-500 transition-all duration-300 flex items-center mx-auto shadow-2xl hover:shadow-emerald-500/25 hover:scale-105"
                  >
                    <div className="p-2 bg-white/20 rounded-lg mr-3">
                      <Download className="w-5 h-5" />
                    </div>
                    下载题目
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}