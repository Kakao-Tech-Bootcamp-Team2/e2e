// test/services/ai-service.ts

import OpenAI from 'openai';
import { TEST_PROMPTS, AI_RESPONSE_TEMPLATES } from '../data/ai-prompts';
import axios from 'axios';

interface AIConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  systemPrompts?: {
    wayneAI?: string;
    consultingAI?: string;
  };
}

interface AIResponse {
  success: boolean;
  content: string;
  error?: string;
}

// Claude API 응답 타입 정의
interface ClaudeResponse {
  content: Array<{
    text: string;
  }>;
}

type AIType = 'wayneAI' | 'consultingAI';

export class AIService {
  private openai: OpenAI;
  private readonly config: AIConfig;
  private readonly defaultSystemPrompts = {
    wayneAI: "당신은 WayneAI라는 AI어시스턴트입니다. 항상 한국어로 만들어주세요. \", '는 사용하지 말아주세요.",
    consultingAI: "당신은 전문 컨설턴트입니다. 항상 한국어로 응답해주세요."
  };

  constructor(config: AIConfig) {
    this.config = {
      ...config,
      systemPrompts: {
        ...this.defaultSystemPrompts,
        ...config.systemPrompts
      }
    };
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });
  }

  async generateResponse(
    promptKey: string,
    parameters: Record<string, string>,
    aiType: AIType
  ): Promise<AIResponse> {
    try {
      const promptTemplate = TEST_PROMPTS[promptKey];
      if (!promptTemplate) {
        throw new Error(`프롬프트 키가 유효하지 않습니다: ${promptKey}`);
      }

      const prompt = this.replacePromptParameters(promptTemplate.prompt, parameters);
      
      return aiType === 'wayneAI' ? 
        await this.callGPT(prompt) : 
        await this.callClaude(prompt);

    } catch (error) {
      console.error('AI 응답 생성 오류:', error);
      return {
        success: false,
        content: AI_RESPONSE_TEMPLATES.ERROR.API_ERROR,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      };
    }
  }

  private replacePromptParameters(prompt: string, parameters: Record<string, string>): string {
    return Object.entries(parameters).reduce(
      (acc, [key, value]) => acc.replace(`[${key}]`, value),
      prompt
    );
  }

  private async callGPT(prompt: string): Promise<AIResponse> {
    try {
      const systemPrompt = this.config.systemPrompts?.wayneAI || this.defaultSystemPrompts.wayneAI;
      
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ]
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('GPT 응답이 비어있습니다');
      }

      return { success: true, content };
    } catch (error) {
      throw new Error(`GPT API 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async callClaude(prompt: string): Promise<AIResponse> {
    try {
      const response = await axios.post<ClaudeResponse>(
        'https://api.anthropic.com/v1/messages',
        {
          model: process.env.CLAUDE_MODEL || 'claude-3-opus-20240229',
          max_tokens: 1024,
          messages: [
            { 
              role: 'system', 
              content: this.config.systemPrompts?.consultingAI 
            },
            { 
              role: 'user', 
              content: prompt 
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      if (!response.data.content[0]?.text) {
        throw new Error('Claude 응답이 비어있습니다');
      }

      return {
        success: true,
        content: response.data.content[0].text
      };
    } catch (error) {
      throw new Error(`Claude API 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
}