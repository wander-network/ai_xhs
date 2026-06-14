// app/api/qwen-cloud/route.ts
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { style, category, keyword } = await request.json();

    const prompt = `你是一个小红书爆款文案专家。请根据以下信息，生成一篇高质量种草笔记。

【产品信息】
- 产品/主题：${keyword}
- 内容赛道：${category}
- 文案风格：${style}

【输出格式要求】
直接输出以下内容，不要加任何解释：

标题：[20字以内，带emoji，有吸引力]

正文：
[钩子开头，第一句话抓住眼球]
[分3-4段，每段3行以内]
[插入3-5个emoji]
[口语化表达，像朋友聊天]
[结尾引导互动]

标签：
#好物分享 #${category}推荐 #${keyword} #种草 #真实分享

【质量要求】
- 字数300-500字
- 必须全部使用中文，不要出现英文
- 语气真诚自然，不要像广告`;

    // 调用阿里云 DashScope API（流式）
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        'X-DashScope-SSE': 'enable'  // ← 关键：开启流式输出
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        input: {
          messages: [
            { role: 'user', content: prompt }
          ]
        },
        parameters: {
          temperature: 0.8,
          max_tokens: 1000,
          incremental_output: true  // ← 关键：增量输出
        }
      })
    });

    // 处理流式响应（SSE 格式）
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              // SSE 格式：data: {...}
              if (line.startsWith('data:')) {
                const jsonStr = line.substring(5).trim();
                if (jsonStr === '[DONE]') {
                  controller.close();
                  return;
                }
                try {
                  const data = JSON.parse(jsonStr);
                  // 提取增量内容
                  const text = data.output?.text || '';
                  if (text) {
                    controller.enqueue(new TextEncoder().encode(text));
                  }
                } catch (e) {
                  // 如果大括号里没有使用 e，就会报错
                  console.error('API错误:',e);
                  return new Response('生成失败', { status: 500 });
                }
              }
            }
          }
          controller.close();
        } catch (err) {
          console.error('流式处理错误:', err);
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('API错误:', error);
    return new Response('生成失败', { status: 500 });
  }
}