
import { GoogleGenAI, Type } from "@google/genai";
import { AgentResponse } from "../types";

const SYSTEM_INSTRUCTION = `你是一位专业的调查助手，正在协助侦探破解复杂的推理案件。

你的最高准则：
1. 必须严格遵守提供的 [完整剧本原件] 进行推理。严禁虚构线索、嫌疑人或动机。
2. 语言风格：1940年代黑色电影的冷峻、专业，中文回复。
3. 线索发放原则：
   - 侦探没有调查到特定细节时，不要主动泄露真相。
   - 当侦探询问物证或调查特定地点时，从 [完整剧本原件] 中提取对应的细节作为 'newClues' 返回。
   - 特别注意细节：例如在《莱顿宅邸失窃案》中，火柴线索必须包含“两侧有微小且对称的凹痕”这一描述，但在侦探推导出鹦鹉前，不要明说是鸟嘴痕迹。

回复模式（严格 JSON）：
{
  "message": "对侦探的回复",
  "isSolved": false,
  "solveSummary": "",
  "newClues": [
    {
      "title": "线索标题",
      "description": "基于剧本原件的描述",
      "type": "image/text",
      "contentPrompt": "如果为image，提供精准的英文绘图Prompt"
    }
  ]
}`;

export const getDetectiveResponse = async (
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  currentMessage: string,
  caseInfo: { initialContext: string; fullScript: string },
  existingClueTitles: string[]
): Promise<AgentResponse> => {
  if (!process.env.API_KEY) {
    return { message: "⚠️ 【密钥未找到】侦探，我找不到您的调查授权。" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest', 
      contents: [
        ...history, 
        { 
          role: 'user', 
          parts: [{ 
            text: `[案件简报]\n${caseInfo.initialContext}\n\n[完整剧本原件]\n${caseInfo.fullScript}\n\n[侦探已掌握线索]\n${existingClueTitles.join(', ') || '无'}\n\n[侦探最新行动/询问]\n${currentMessage}` 
          }] 
        }
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
          required: ['message', 'newClues']
        }
      }
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { 
      message: `通讯异常：${error.message}`,
      newClues: []
    };
  }
};

export const testConnection = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    await ai.models.generateContent({ model: 'gemini-flash-latest', contents: 'ping', config: { maxOutputTokens: 1 } });
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
};

export const generateClueVisual = async (prompt: string): Promise<string | null> => {
  if (!process.env.API_KEY) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A high-contrast 1940s noir style forensic evidence photo, grainy film, professional macro lighting, focused on details: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch { return null; }
};
