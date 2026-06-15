// app/page.tsx
'use client';

import { useState } from 'react';
import { saveToHistory } from './utils/storage';

export default function Home() {
  // 状态定义
  const [selectedStyle, setSelectedStyle] = useState('活泼');
  const [selectedCategory, setSelectedCategory] = useState('美妆');
  const [keyword, setKeyword] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // ⭐⭐⭐ 流式生成函数 - 放在组件内部 ⭐⭐⭐
  const generateStream = async (style: string, category: string, keyword: string) => {
    if (!keyword.trim()) {
      alert('请输入产品卖点或关键词');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');  // 清空之前的内容

    try {
      const response = await fetch('/api/qwen-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, category, keyword })
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulated += chunk;
        setGeneratedContent(accumulated);  // 逐字更新显示
      }

      // 生成完成后保存到历史记录
      saveToHistory(style, category, keyword, accumulated);

    } catch (error) {
      let errorMsg = '生成失败，请重试';

      if (error instanceof Error) {
        const message = error.message || '';

        if (message.includes('balance') || message.includes('quota')) {
          errorMsg = 'API 额度不足，请联系管理员充值';
        } else if (message.includes('timeout')) {
          errorMsg = '生成超时，请稍后再试';
        } else if (message.includes('401') || message.includes('key')) {
          errorMsg = '服务配置错误，请联系管理员';
        }
      }

      setGeneratedContent(errorMsg);
    }
  };

  // 修改按钮的 onClick
  const handleGenerate = () => {
    generateStream(selectedStyle, selectedCategory, keyword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white p-4">
      <div className="max-w-3xl mx-auto">
        {/* 标题 */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          ✨ 小红书文案生成器
        </h1>
        <p className="text-center text-gray-500 mb-8">
          10秒生成爆款文案，一键复制发布
        </p>

        {/* 风格选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">选择风格</label>
          <div className="flex flex-wrap gap-2">
            {['活泼', '温柔', '专业', '搞笑', '文艺'].map(style => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`px-4 py-2 rounded-full transition ${
                  selectedStyle === style 
                    ? 'bg-pink-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* 赛道选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">选择赛道</label>
          <div className="flex flex-wrap gap-2">
            {['美妆', '穿搭', '美食', '家居', '旅行'].map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full transition ${
                  selectedCategory === category 
                    ? 'bg-pink-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 输入框 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            产品卖点 / 关键词
          </label>
          <textarea
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例如：一款保湿不油腻的面霜，适合干皮，用了皮肤很水润"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
            rows={3}
          />
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !keyword.trim()}
          className={`w-full py-3 rounded-lg font-medium transition ${
            isGenerating || !keyword.trim()
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-pink-500 hover:bg-pink-600 text-white'
          }`}
        >
          {isGenerating ? '✨ 生成中...' : '✨ 生成文案'}
        </button>

        {/* 输出区域 */}
        {generatedContent && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">生成的文案</label>
              <button
                onClick={() => navigator.clipboard.writeText(generatedContent)}
                className="text-sm text-pink-500 hover:text-pink-600"
              >
                📋 一键复制
              </button>
            </div>
            <div className="bg-white rounded-lg border p-4 whitespace-pre-wrap">
              {generatedContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}