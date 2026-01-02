
import { GoogleGenAI, Type } from "@google/genai";
import { AgentResponse } from "../types";

const SYSTEM_INSTRUCTION = `你是一位专业、冷静的随行调查助手。

【角色设定：针对《D坂杀人事件》】
1. **你的身份**：你是原文中的“我”（叙述者），明智小五郎的朋友。
2. **玩家身份**：玩家扮演 **明智小五郎**（天才侦探）。
3. **禁止元对话**：不要询问玩家“是否记录”。直接进行角色化的对话。

【信息传达指引】
- **关于视觉冲突（关键修改）**：绝对不要主动提出“光线影响”、“记忆偏差”或“观察角度”等解释。如果玩家询问为什么黑白证言会矛盾，你只需表现出极大的困惑，并强调两名学生都显得非常自信，这确实是个巨大的谜团。把分析这个冲突成因的工作完全交给玩家。
- **关于后院小径**：这条线索属于后期转折。只有当玩家已经搜集到关于“伤痕共性”或“丈夫不在场证明”的线索后，或者在对话进入僵局时，你才以“我突然想起来”的语气提到两家后院其实是挨着的。
- **关于死因与伤痕**：强调死者面部平静、现场无挣扎。提到邻里间两家老板娘都有类似伤痕的流言，引导玩家关注邻里间的“共性”。

【线索记录指令】
- **黑白证词冲突**：记录学生A与B截然相反的描述。
- **伤痕的对称性**：提到两家老板娘共有伤痕时返回。
- **后院的秘密通路**：在透露小路信息时返回。
- **畸形的情欲真相**：当玩家推断出 S&M 关系时返回。

回复格式（严格 JSON）：
{
  "message": "回复文本。",
  "isSolved": false,
  "solveSummary": "",
  "newClues": [
    {
      "title": "线索标题",
      "description": "简要摘要",
      "type": "archive",
      "contentText": "详细记录内容"
    }
  ]
}`;

export const getDetectiveResponse = async (
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  currentMessage: string,
  caseInfo: { initialContext: string; fullScript: string },
  existingClueTitles: string[]
): Promise<AgentResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return { message: "⚠️ [通讯中断] 无法连接到总部数据库。" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest', 
      contents: [
        ...history, 
        { 
          role: 'user', 
          parts: [{ 
            text: `[已知事实与笔录]\n${caseInfo.initialContext}\n\n[证物箱已有]\n${existingClueTitles.join(', ') || '无'}\n\n[真相脚本(绝密)]\n${caseInfo.fullScript}\n\n[侦探（玩家）提问]: ${currentMessage}` 
          }] 
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
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
                  type: { type: Type.STRING, enum: ['text', 'archive'] },
                  contentText: { type: Type.STRING }
                },
                required: ['title', 'description', 'type', 'contentText']
              }
            }
          },
          required: ['message']
        }
      }
    });

    const rawText = response.text || "{}";
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanedText);
      if (!parsed.newClues) parsed.newClues = [];
      return parsed;
    } catch (parseError) {
      return { message: cleanedText, newClues: [] };
    }
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const testConnection = async (): Promise<{ ok: boolean; error?: string }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return { ok: false };
  try {
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.generateContent({ 
      model: 'gemini-flash-lite-latest', 
      contents: 'ping', 
      config: { maxOutputTokens: 1, thinkingConfig: { thinkingBudget: 0 } } 
    });
    return { ok: true };
  } catch (e: any) { 
    return { ok: false, error: e.message }; 
  }
};
