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

  // 格式化答案内容
  const formatAnswer = (answer: string) => {
    // 简化答案，只保留核心思路
    let formatted = answer
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
      
      // 通过后端代理调用腾讯云 OCR API
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
        setJobDescription(content);
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
      let prompt = `基于以下信息生成10个面试题目：

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
        } catch (e) {
          // 如果还是失败，尝试提取JSON部分
          const jsonMatch = content.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            try {
              generatedQuestions = JSON.parse(jsonMatch[0]);
            } catch (e2) {
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
    <div className="min-h-screen bg-[#ededed]">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-[#07c160] p-2.5 rounded-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-medium text-[#1a1a1a] mb-2">
            面试助手
          </h1>
          <p className="text-base text-[#888888] max-w-xl mx-auto">
            上传简历和岗位描述，生成模拟面试题目
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-[#07c160]/10 p-2 rounded-md mr-2.5">
                <FileText className="w-5 h-5 text-[#07c160]" />
              </div>
              <h2 className="text-lg font-medium text-[#1a1a1a]">上传简历</h2>
            </div>
            <div className="border-2 border-dashed border-[#d9d9d9] rounded-lg p-6 text-center hover:border-[#07c160] transition-colors bg-[#fafafa]">
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.doc,.docx,image/*"
                onChange={handleResumeUpload}
                className="hidden"
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <Upload className="w-9 h-9 text-[#b2b2b2] mx-auto mb-2" />
                <p className="text-sm text-[#1a1a1a] mb-1">
                  {resumeFile ? resumeFile.name : '点击上传或拖拽文件'}
                </p>
                <p className="text-xs text-[#888888]">
                  支持 PDF、Word、图片（最大 10MB）
                </p>
              </label>
              {resumeFile && (
                <div className="mt-3 flex items-center justify-center text-[#07c160]">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span className="text-sm">上传成功</span>
                </div>
              )}
              {resumeContent && (
                <div className="mt-3">
                  <div className="text-xs text-[#888888] mb-1">识别到的简历内容：</div>
                  <div className="text-xs text-[#1a1a1a] bg-[#f7f7f7] p-2 rounded border max-h-20 overflow-y-auto">
                    {resumeContent}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="bg-[#576b95]/10 p-2 rounded-md mr-2.5">
                <Briefcase className="w-5 h-5 text-[#576b95]" />
              </div>
              <h2 className="text-lg font-medium text-[#1a1a1a]">岗位描述</h2>
            </div>
            <div className="space-y-3">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="粘贴岗位描述..."
                className="w-full h-28 px-3 py-2.5 border border-[#d9d9d9] rounded-lg focus:outline-none focus:border-[#576b95] resize-none text-sm text-[#1a1a1a] placeholder-[#b2b2b2] bg-[#fafafa]"
              />
              <div className="border-2 border-dashed border-[#d9d9d9] rounded-lg p-5 text-center hover:border-[#576b95] transition-colors bg-[#fafafa]">
                <input
                  type="file"
                  id="job-desc-upload"
                  accept="image/*"
                  onChange={handleJobDescImageUpload}
                  className="hidden"
                />
                <label htmlFor="job-desc-upload" className="cursor-pointer">
                  <Upload className="w-7 h-7 text-[#b2b2b2] mx-auto mb-1.5" />
                  <p className="text-xs text-[#1a1a1a]">
                    {jobDescImage ? jobDescImage.name : '或上传图片'}
                  </p>
                </label>
                {jobDescImage && (
                  <div className="mt-2 flex items-center justify-center text-[#07c160]">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span className="text-xs">上传成功</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <button
            onClick={handleGenerateQuestions}
            disabled={isLoading}
            className={`${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#07c160] hover:bg-[#06ad56]'} text-white font-medium px-10 py-3 rounded-lg transition-colors text-base`}
          >
            <span className="flex items-center justify-center">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  正在思考...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成面试题目
                </>
              )}
            </span>
          </button>
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {showQuestions && (
          <div className="space-y-3">
            <div className="text-center mb-6">
              <h3 className="text-xl font-medium text-[#1a1a1a] mb-1">模拟面试题目</h3>
              <p className="text-sm text-[#888888]">练习这些问题，提升面试表现</p>
            </div>
            {questions.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-5"
              >
                <div className="flex items-start mb-3">
                  <div className="bg-[#07c160] text-white font-medium rounded-md w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0 text-sm">
                    {index + 1}
                  </div>
                  <h4 className="text-base font-medium text-[#1a1a1a] leading-relaxed pt-1">
                    {item.question}
                  </h4>
                </div>
                <div className="ml-11">
                  <div className="bg-[#f7f7f7] border-l-3 border-l-[#07c160] rounded-md p-4">
                    <p className="text-xs text-[#888888] mb-2 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      建议答案
                    </p>
                    <div className="text-sm text-[#3a3a3a] leading-relaxed">
                      {formatAnswer(item.answer).map((line, lineIndex) => (
                        <div key={lineIndex} className="mb-1">
                          {line.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;