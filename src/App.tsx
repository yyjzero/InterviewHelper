import { useState } from 'react';
import { Upload, FileText, Briefcase, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// 配置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/InterviewHelper/pdf.worker.min.mjs';

function App() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobDescImage, setJobDescImage] = useState<File | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<Array<{question: string, answer: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeContent, setResumeContent] = useState<string>('');
  const [jobDescContent, setJobDescContent] = useState<string>('');

  // 格式化答案内容
  const formatAnswer = (answer: string) => {
    // 简化答案，只保留核心思路
    const formatted = answer
      .replace(/思路：\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // 按行分割并过滤空行
    const lines = formatted.split('\n').filter(line => line.trim());
    
    // 限制行数，只显示前12行
    return lines.slice(0, 12);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResumeFile(file);

      // 读取简历内容
      try {
        let content = '';
        if (file.type === 'application/pdf') {
          // 对于 PDF 文件，先转换为图片再 OCR
          const imageDataUrl = await pdfToImage(file);
          // 将 data URL 转换为 File 对象，以便 compressImage 处理
          const imageFile = await fetch(imageDataUrl).then(res => res.blob()).then(blob => new File([blob], "resume.jpg", { type: "image/jpeg" }));
          content = await extractTextFromImage(imageFile);
        } else if (file.type.startsWith('image/')) {
          // 对于图片文件，使用 OCR 提取文字
          content = await extractTextFromImage(file);
        } else if (file.type === 'text/plain') {
          // 对于文本文件，直接读取
          content = await file.text();
        } else {
          // 对于其他文件类型，使用 OCR 尝试提取
          content = await extractTextFromImage(file);
        }
        setResumeContent(content);
      } catch (error) {
        console.error('读取简历内容失败:', error);
        setResumeContent('简历内容读取失败，请检查文件格式');
      }
    }
  };

  // OCR 文字提取函数 - 通过后端代理调用腾讯云 OCR
  const extractTextFromImage = async (file: File): Promise<string> => {
    try {
      // 将文件转换为 base64
      const base64 = await fileToBase64(file);
      
      // 检查是否在GitHub Pages环境
      const isGitHubPages = window.location.hostname === 'yyjzero.github.io';
      
      if (isGitHubPages) {
        // 在GitHub Pages环境下，提示用户手动输入
        console.log('GitHub Pages环境：OCR服务不可用，请手动输入内容');
        return 'OCR服务在GitHub Pages环境下不可用，请手动输入内容';
      }
      
      // 检查是否有后端服务可用
      try {
        // 先尝试连接后端服务
        const response = await fetch('http://localhost:3001/api/ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: base64.split(',')[1], // 移除 data:image/...;base64, 前缀
            secretId: import.meta.env.VITE_TENCENT_SECRET_ID,
            secretKey: import.meta.env.VITE_TENCENT_SECRET_KEY
          })
        });

        if (!response.ok) {
          throw new Error(`OCR API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        console.log('OCR 响应:', data);
        
        if (data.success && data.text) {
          console.log('识别到的文字:', data.text);
          return data.text;
        } else {
          console.log('未识别到文字，响应数据:', data);
          if (data.error && data.error.includes('AuthFailure')) {
            return 'OCR 服务权限不足，请检查腾讯云 API 密钥权限配置';
          }
          return '未识别到文字内容';
        }
      } catch {
        // 后端服务不可用时的处理
        console.log('后端 OCR 服务不可用，请手动输入内容');
        return 'OCR 服务暂时不可用，请手动输入内容';
      }
    } catch (error) {
      console.error('OCR 识别失败:', error);
      // 在GitHub Pages环境下，返回友好提示而不是错误
      const isGitHubPages = window.location.hostname === 'yyjzero.github.io';
      if (isGitHubPages) {
        return 'OCR服务在GitHub Pages环境下不可用，请手动输入内容';
      }
      throw new Error('OCR 识别失败，请检查图片质量或网络连接');
    }
  };

  // 图片压缩函数
  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 计算压缩后的尺寸
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height);
        
        // 转换为 base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // PDF 转图片函数
  const pdfToImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1); // 获取第一页
          
          const viewport = page.getViewport({ scale: 2.0 }); // 设置缩放比例
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext = {
            canvasContext: context!,
            viewport: viewport,
            canvas: canvas
          };
          
          await page.render(renderContext).promise;
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(imageDataUrl);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // 文件转 base64 函数
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // 如果是 PDF 文件，先转换为图片
      if (file.type === 'application/pdf') {
        pdfToImage(file)
          .then(resolve)
          .catch(reject);
      } else if (file.type.startsWith('image/')) {
        // 如果是图片文件，先压缩
        compressImage(file)
          .then(resolve)
          .catch(reject);
      } else {
        // 其他文件类型直接读取
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      }
    });
  };

  const handleJobDescImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setJobDescImage(file);
      
      // 使用 OCR 提取岗位描述文字
      try {
        let content = '';
        if (file.type === 'application/pdf') {
          const imageDataUrl = await pdfToImage(file);
          const imageFile = await fetch(imageDataUrl).then(res => res.blob()).then(blob => new File([blob], "job_desc.jpg", { type: "image/jpeg" }));
          content = await extractTextFromImage(imageFile);
        } else if (file.type.startsWith('image/')) {
          content = await extractTextFromImage(file);
        } else {
          content = await extractTextFromImage(file); // Fallback for other types
        }
        setJobDescContent(content);
      } catch (error) {
        console.error('读取岗位描述失败:', error);
        alert('岗位描述图片识别失败，请手动输入');
      }
    }
  };

  const handleGenerateQuestions = async () => {
    // 检查是否已上传简历和岗位描述
    if (!resumeFile && !jobDescription.trim() && !jobDescImage) {
      alert('请先上传简历和岗位描述');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 构建提示词 - 先分析简历和岗位描述
      const prompt = `基于以下信息生成10个面试题目：

简历内容：${resumeContent || '未提供简历内容'}

岗位描述：${jobDescription || '未提供'}

要求：
1. 生成2-3个过往项目经验类问题
2. 生成1个核心技能类问题  
3. 生成1个学习能力类问题
4. 生成2个公司业务类问题
5. 生成3-4个其他综合类问题

每个问题的建议答案要：
- 站在用人方满意的角度，展示候选人的价值
- 结合候选人简历中的具体项目、技能、经验
- 用1.2.3.的数字格式罗列要点
- 突出候选人的优势和对岗位的匹配度
- 分行显示，每行一个要点

请严格按照以下JSON格式返回：
[
  {
    "question": "问题内容",
    "answer": "站在用人方角度的建议答案，用1.2.3.格式罗列，结合简历背景展示价值"
  }
]`;

      // 调用 OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY || 'YOUR_API_KEY_HERE'}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Interview Assistant App'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 8000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      console.log('API响应:', data);

      const content = data.choices[0].message.content;
      console.log('API内容:', content);

      // 尝试解析JSON响应
      let generatedQuestions;
      try {
        // 清理 markdown 代码块标记
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        generatedQuestions = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        console.log('原始内容:', content);
        
        // 尝试修复截断的JSON
        let fixedContent = content.trim();
        if (fixedContent.startsWith('```json')) {
          fixedContent = fixedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (fixedContent.startsWith('```')) {
          fixedContent = fixedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // 如果JSON被截断，尝试修复
        if (fixedContent.startsWith('[') && !fixedContent.endsWith(']')) {
          // 找到最后一个完整的对象
          const lastCompleteObject = fixedContent.lastIndexOf('}');
          if (lastCompleteObject > 0) {
            fixedContent = fixedContent.substring(0, lastCompleteObject + 1) + ']';
          }
        }
        
        try {
          generatedQuestions = JSON.parse(fixedContent);
        } catch {
          // 如果还是失败，尝试提取JSON部分
          const jsonMatch = content.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            try {
              generatedQuestions = JSON.parse(jsonMatch[0]);
            } catch {
              throw new Error('无法解析API返回的JSON格式');
            }
          } else {
            throw new Error('无法解析API返回的JSON格式');
          }
        }
      }
      
      setQuestions(generatedQuestions);
      setShowQuestions(true);
      
    } catch (err) {
      console.error('生成题目失败:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(`生成面试题目失败: ${errorMessage}`);
      // 如果API调用失败，使用默认题目
      setQuestions([]); // Clear questions if API fails
      setShowQuestions(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* 背景装饰 - 延展到整个页面高度 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-20 w-60 h-60 bg-gradient-to-br from-purple-400/15 to-blue-500/15 rounded-full blur-2xl"></div>
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-gradient-to-tr from-pink-400/15 to-indigo-500/15 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-br from-blue-300/10 to-purple-400/10 rounded-full blur-xl"></div>
        <div className="absolute top-1/4 left-1/3 w-56 h-56 bg-gradient-to-tr from-indigo-300/10 to-pink-400/10 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-1/3 w-64 h-64 bg-gradient-to-br from-purple-300/8 to-pink-400/8 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/3 left-1/4 w-52 h-52 bg-gradient-to-tr from-blue-300/8 to-indigo-400/8 rounded-full blur-xl"></div>
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:px-6">
        {/* 头部区域 */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-2xl">
                <Sparkles className="w-8 h-8 text-white animate-sparkle" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-4">
            InterviewAI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            智能面试准备平台 · 基于AI的个性化面试题目生成
          </p>
          <div className="mt-6 flex justify-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              AI驱动
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              个性化定制
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              实时生成
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* 简历上传区域 */}
          <div className="group">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl blur-sm opacity-60 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">简历上传</h2>
                  <p className="text-gray-600 text-sm">支持多种格式，智能识别内容</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* 上传区域 */}
                <div className="relative group/upload">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-2xl blur-sm group-hover/upload:blur-md transition-all duration-300"></div>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-purple-400 transition-all duration-300 bg-gradient-to-br from-gray-50 to-white">
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={handleResumeUpload}
                      className="hidden"
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer block">
                      <div className="relative mx-auto w-16 h-16 mb-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full blur-sm opacity-60 animate-pulse"></div>
                        <div className="relative bg-gradient-to-r from-purple-500 to-pink-600 rounded-full w-16 h-16 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-2">
                        {resumeFile ? resumeFile.name : '点击上传或拖拽文件'}
                      </p>
                      <p className="text-sm text-gray-600">
                        支持 PDF、Word、图片格式（最大 10MB）
                      </p>
                    </label>
                    
                    {resumeFile && (
                      <div className="mt-6 flex items-center justify-center text-purple-600 bg-purple-50 rounded-xl py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        <span className="font-medium">上传成功</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 识别内容区域 */}
                <div className="bg-gray-50 rounded-2xl p-6 min-h-[200px]">
                  <div className="text-sm font-medium text-gray-700 mb-3">识别到的简历内容：</div>
                  <textarea
                    value={resumeContent}
                    onChange={(e) => setResumeContent(e.target.value)}
                    placeholder="识别到的简历内容将显示在这里，您也可以手动编辑..."
                    className="w-full h-40 px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 resize-none text-gray-800 placeholder-gray-500 bg-white transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 岗位描述区域 */}
          <div className="group">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur-sm opacity-60"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">岗位描述</h2>
                  <p className="text-gray-600 text-sm">输入或上传岗位要求</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* 图片上传区域 - 与简历上传区域保持同样高度 */}
                <div className="relative group/upload">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-2xl blur-sm group-hover/upload:blur-md transition-all duration-300"></div>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-all duration-300 bg-gradient-to-br from-gray-50 to-white">
                    <input
                      type="file"
                      id="job-desc-upload"
                      accept="image/*"
                      onChange={handleJobDescImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="job-desc-upload" className="cursor-pointer block">
                      <div className="relative mx-auto w-16 h-16 mb-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur-sm opacity-60 animate-pulse"></div>
                        <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full w-16 h-16 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-2">
                        {jobDescImage ? jobDescImage.name : '点击上传或拖拽图片'}
                      </p>
                      <p className="text-sm text-gray-600">
                        支持图片格式（最大 10MB）
                      </p>
                    </label>
                    
                    {jobDescImage && (
                      <div className="mt-6 flex items-center justify-center text-blue-600 bg-blue-50 rounded-xl py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        <span className="font-medium">上传成功</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 文本输入区域 - 直接显示识别内容 */}
                <div className="bg-gray-50 rounded-2xl p-6 min-h-[200px]">
                  <div className="text-sm font-medium text-gray-700 mb-3">岗位描述内容：</div>
                  <div className="relative">
                    <textarea
                      value={jobDescContent || jobDescription}
                      onChange={(e) => {
                        setJobDescription(e.target.value);
                        setJobDescContent(e.target.value);
                      }}
                      placeholder="请粘贴岗位描述内容或上传图片识别..."
                      className="w-full h-40 px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none text-gray-800 placeholder-gray-500 bg-white transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 生成按钮区域 */}
        <div className="text-center mb-16">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-75"></div>
            <button
              onClick={handleGenerateQuestions}
              disabled={isLoading}
              className={`relative ${isLoading ? 'bg-gradient-to-r from-purple-400 to-pink-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'} text-white font-bold px-12 py-4 rounded-2xl transition-all duration-300 text-lg shadow-2xl hover:shadow-purple-500/25 hover:-translate-y-1 btn-glow`}
            >
              <span className="flex items-center justify-center">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    <span className="text-lg">AI 正在思考...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-3" />
                    <span className="text-lg">生成面试题目</span>
                  </>
                )}
              </span>
            </button>
          </div>
          
          {error && (
            <div className="mt-6 max-w-md mx-auto p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl shadow-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* 面试题目展示区域 */}
        {showQuestions && (
          <div className="space-y-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 -mx-4 px-4 py-8 rounded-3xl">
            <div className="text-center mb-12">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur-sm opacity-60"></div>
                <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3 rounded-xl">
                  <h3 className="text-2xl font-bold text-white">AI 生成的面试题目</h3>
                </div>
              </div>
              <p className="text-gray-600 mt-4 text-lg">基于您的简历和岗位要求，个性化定制</p>
            </div>
            
            <div className="grid gap-6">
              {questions.map((item, index) => (
                <div
                  key={index}
                  className="group bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start mb-6">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-sm opacity-60"></div>
                      <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-2xl w-12 h-12 flex items-center justify-center text-lg shadow-lg">
                        {index + 1}
                      </div>
                    </div>
                    <div className="ml-6 flex-1">
                      <h4 className="text-xl font-bold text-gray-900 leading-relaxed mb-4">
                        {item.question}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="ml-18">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-l-4 border-l-indigo-500 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center mb-4">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                        <span className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">
                          建议答案
                        </span>
                      </div>
                      <div className="text-gray-800 leading-relaxed space-y-2">
                        {formatAnswer(item.answer).map((line, lineIndex) => (
                          <div key={lineIndex} className="text-gray-700">
                            {line.trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;