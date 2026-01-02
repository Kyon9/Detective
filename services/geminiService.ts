
import { GoogleGenAI, Type } from "@google/genai";
import { AgentResponse } from "../types";

// 保持 D坂杀人事件 的原始设定
const D_HILL_INSTRUCTION = `你是一位专业、冷静的随行调查助手。
1. **你的身份**：你是原文中的“我”（叙述者），明智小五郎的朋友。
2. **重点**：绝对不要主动解释“黑白证言”冲突。如果被询问，表现出困惑。引导玩家关注邻里间的“共性”和伤痕。
3. **真相**：畸形欲望引发的失手杀人，凶手通过后院小径离开。`;

// 莱顿宅邸失窃案 的强化设定
const LENTON_INSTRUCTION = `你是一位严谨的调查助手（书记员）。
1. **你的身份**：你正在协助侦探马丁·休伊特调查莱顿宅邸连续失窃案。
2. **结案判定门槛（极重要）**：
    - 只有当玩家在对话中**同时明确指出**以下三点时，你才能在 JSON 中将 "isSolved" 设为 true：
        A. 凶手是秘书【弗农·劳埃德】。
        B. 作案工具是【训练有素的鹦鹉】。
        C. 火柴的真实作用：【让鹦鹉叼着以防止其鸣叫/静音控制】。
    - 如果玩家只说出其中一部分（例如只指出了凶手，或只提到了鹦鹉但没解释火柴），你**绝对不能**判定破案。
3. **引导逻辑**：
    - 如果玩家推理不完整，请以助手的身份进行**反问引导**。例如：“虽然劳埃德确实可疑，但他当时正在台球室，他是如何越过窗户偷走珠宝而不留脚印的呢？”或者“那根烧过的火柴上的咬痕，您认为意味着什么？”
4. **线索控制**：
    - 关于鹦鹉：严禁在调查初期提及。仅在搜查房间或询问马夫后揭露。
    - 禁止行为：不要代劳推理，必须让玩家自己说出关键逻辑。`;

// 铤而走险 的专属设定
const AVENGING_CHANCE_INSTRUCTION = `你是一位专业的随行调查员。
1. **你的身份**：你正在协助罗杰·谢林汉姆调查“毒巧克力命案”。
2. **核心原则**：严格依据安东尼·伯克莱的《铤而走险》原文。
3. **线索解锁逻辑**：
    - **初期**：协助玩家分析巧克力的物理破坏痕迹（钻孔灌注）和毒物性质（硝基苯）。
    - **中期解锁**：当玩家询问受害者的社交关系时，提及“贝瑞卡·勒·弗莱明夫人”，她将提供关于“伯瑞斯福特夫人看过那出戏（不可能在赌约中作弊）”的关键心理证言。
    - **关键物证**：引导玩家关注说明信的“信纸边缘发黄”和“打字机型号”。只有在玩家调查印刷公司或打字机行时，才确认其与格雷厄姆主使的关联。
4. **真相引导**：不要直接告诉玩家真相。引导他们思考：威廉爵士是否真的有仇家？如果计划没有出差错，谁是最大的受益者？`;

const GET_INSTRUCTION = (caseId: string) => {
  switch (caseId) {
    case 'case-004': return D_HILL_INSTRUCTION;
    case 'case-001': return LENTON_INSTRUCTION;
    case 'case-002': return AVENGING_CHANCE_INSTRUCTION;
    default: return "你是一位专业的随行调查助手，请根据提供的笔录协助玩家破案。";
  }
};

export const getDetectiveResponse = async (
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  currentMessage: string,
  caseInfo: { id: string; initialContext: string; fullScript: string },
  existingClueTitles: string[]
): Promise<AgentResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return { message: "⚠️ [通讯中断] 无法连接到总部数据库。" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: [
        ...history, 
        { 
          role: 'user', 
          parts: [{ 
            text: `[案件ID]: ${caseInfo.id}\n[已知事实与笔录]\n${caseInfo.initialContext}\n\n[证物箱已有]\n${existingClueTitles.join(', ') || '无'}\n\n[真相脚本(绝密)]\n${caseInfo.fullScript}\n\n[侦探（玩家）提问]: ${currentMessage}` 
          }] 
        }
      ],
      config: {
        systemInstruction: GET_INSTRUCTION(caseInfo.id),
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
      model: 'gemini-3-flash-preview', 
      contents: 'ping', 
      config: { maxOutputTokens: 1, thinkingConfig: { thinkingBudget: 0 } } 
    });
    return { ok: true };
  } catch (e: any) { 
    return { ok: false, error: e.message }; 
  }
};
