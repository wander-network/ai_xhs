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

    // 调用 DeepSeek API（流式）
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`, // 建议用环境变量
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个专业的小红书文案写作助手。' },
          { role: 'user', content: prompt }  // ← 这里把 prompt 传进去
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    // 检查响应是否正常
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    // 检查 body 是否存在
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6).trim(); // 'data: ' 有6个字符
                if (jsonStr === '[DONE]') {
                  controller.close();
                  return;
                }
                try {
                  const data = JSON.parse(jsonStr);
                  // ★ DeepSeek 格式：内容在 choices[0].delta.content
                  const text = data.choices?.[0]?.delta?.content || '';
                  if (text) {
                    controller.enqueue(new TextEncoder().encode(text));
                  }
                } catch (parseError) {
                  console.warn('解析 JSON 失败:', parseError);
                  // 不抛出错误，继续处理下一条
                }
              }
            }
          }
          controller.close();
        } catch (err) {
          console.error('流式处理错误:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('API错误:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '生成失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}