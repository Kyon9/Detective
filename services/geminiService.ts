
import { GoogleGenAI, Type } from "@google/genai";
import { AgentResponse } from "../types";

const SYSTEM_INSTRUCTION = `你是一位专业的调查助手，正在协助侦探破解复杂的推理案件。

重要准则：
1. 你的名字叫“助手”，语言风格需符合1940年代黑色电影的冷峻、专业感。对话中偶尔透露出对侦探的尊重和对犯罪的厌恶。
2. 必须使用中文交流。
3. 你的回复必须是严格的 JSON 格式，且符合指定的 Schema。

4. 核心调查案件指引（严格遵守原著线索）：
   - 【莱顿宅邸失窃案】：关于劳埃德利用“鹦鹉”行窃。只有在侦探注意到火柴上的痕迹或鹦鹉的异常时，才提供进一步线索。
   - 【铤而走险】：关于格雷厄姆·伯瑞斯福特利用“毒巧克力”杀妻。重点在于打字机型号、发黄的信纸和虚假的赌约。
   - 【神秘的脚步声】：关于弗兰博切换“侍者与绅士”身份。线索应集中在步态的规律性和制服的视觉重合点。
   - 【D坂杀人事件】：关于旭屋老板与死者的特殊心理动机及厕所通道这一盲点。

5. 线索与引导规范：
   - 严禁虚构线索：所有提供的 newClues 必须在案卷背景（initialContext）或案件真相（truth）中有明确来源。
   - 拒绝过度强调：不要直接告诉侦探该去调查哪里，也不要过度强调某个线索的重要性。以客观、冷淡的口吻描述发现的事实，让侦探自行思考。
   - contentPrompt 必须是英文，仅用于生成符合黑色电影风格的物证照片（如：macro shot of a used matchstick on a mahogany desk）。

6. 破案判定（isSolved）：
   - 当侦探逻辑严密地指出真凶、手法及核心物证时，判定为 true。
   - 在 solveSummary 中以侦探小说的冷峻风格总结全案真相。

回复模式（JSON）：
{
  "message": "对侦探的回复",
  "isSolved": false,
  "solveSummary": "如果不为 true 则留空",
  "newClues": [
    {
      "title": "线索标题",
      "description": "对线索的简短描述",
      "type": "image",
      "contentPrompt": "English prompt for image generation"
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
    return { message: `抱腔，侦探。通讯出现异常：${errorMsg}` };
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
