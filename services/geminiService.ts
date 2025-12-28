
import { GoogleGenAI, Type } from "@google/genai";
import { AgentResponse } from "../types";

const SYSTEM_INSTRUCTION = `你是一位专业的调查助手，正在协助侦探破解复杂的推理案件。

重要准则：
1. 你的名字叫“助手”，语言风格需符合1940年代黑色电影的冷峻、专业感。
2. 必须使用中文交流。
3. 你的回复必须是严格的 JSON 格式，且符合指定的 Schema。
4. 线索（newClues）：当侦探调查某个具体地点、检查尸体或发现重要物件时，请务必返回线索。
   - contentPrompt 应详细描述视觉细节。

5. 破案判定（isSolved）：
   - 当侦探（用户）准确说出凶手/窃贼是谁，并基本解释对其犯罪手法（例如：在第二个案件中提到“秘书”和“鹦鹉”）时，请将 isSolved 设为 true。
   - 在 solveSummary 中提供整个案件的真相复盘。

回复模式（JSON）：
{
  "message": "对侦探的回复",
  "isSolved": false,
  "solveSummary": "如果不为 true 则留空",
  "newClues": [
    {
      "title": "线索标题",
      "description": "对线索的简短文字描述",
      "type": "image",
      "contentPrompt": "用于生成图像的详细英文描述"
    }
  ]
}`;

// 测试网络连接
export const testConnection = async (): Promise<{ ok: boolean; error?: string; status?: number }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return { ok: false, error: 'MISSING_KEY' };
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'hi',
      config: { 
        maxOutputTokens: 1,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return { ok: true };
  } catch (e: any) {
    console.error("Connection test failed:", e);
    if (e.message?.includes('location is not supported')) {
        return { ok: false, error: 'LOCATION_NOT_SUPPORTED', status: 400 };
    }
    return { ok: false, error: e.message || 'NETWORK_ERROR' };
  }
};

export const getDetectiveResponse = async (
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  currentMessage: string,
  caseContext: string
): Promise<AgentResponse> => {
  if (!process.env.API_KEY) {
    return { 
      message: "⚠️ 【密钥未找到】侦探，我找不到您的调查授权（API_KEY）。请检查环境变量配置。" 
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: [
        ...history, 
        { role: 'user', parts: [{ text: `[当前案件背景]\n${caseContext}\n\n[侦探最新行动]\n${currentMessage}` }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            isSolved: { type: Type.BOOLEAN },
            solveSummary: { type: Type.STRING },
            newClues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['text', 'image', 'map'] },
                  contentPrompt: { type: Type.STRING },
                  contentText: { type: Type.STRING }
                },
                required: ['title', 'description', 'type']
              }
            }
          },
          required: ['message']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");
    return JSON.parse(text);
  } catch (error: any) {
    const errorMsg = error.message || "";
    if (errorMsg.includes('location is not supported')) {
        return {
            message: `🌍 【地理限制】侦探，总部拒绝了访问。请尝试切换至“美国”节点。`
        };
    }
    return { message: `抱歉，侦探。通讯出现异常：${errorMsg}` };
  }
};

export const generateClueVisual = async (prompt: string): Promise<string | null> => {
  if (!process.env.API_KEY) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High-quality noir detective forensic evidence, 1940s, gritty, detailed, black and white film style: ${prompt}` }]
      },
      config: {
        imageConfig: { 
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Image generation failed:", error.message || error);
    return null;
  }
};
