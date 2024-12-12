// test/services/message-service.ts
import OpenAI from 'openai';
import { MESSAGE_PROMPTS } from '../data/message-prompts';
import * as dotenv from 'dotenv';

dotenv.config();

interface MessageOptions {
  model?: string;
  temperature?: number;
}

export class MessageService {
  private openai: OpenAI;
  private readonly defaultOptions: MessageOptions = {
    model: 'gpt-4-turbo-preview',
    temperature: 0.7
  };

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }

  private replaceParameters(text: string, parameters?: Record<string, string>): string {
    if (!parameters) return text;
    
    return Object.entries(parameters).reduce(
      (result, [key, value]) => result.replace(`[${key}]`, value),
      text
    );
  }

  async generateMessage(
    promptKeyOrMessage: string,
    parameters?: Record<string, string>,
    options?: MessageOptions
  ): Promise<string> {
    try {
      const finalPrompt = MESSAGE_PROMPTS[promptKeyOrMessage]
        ? this.replaceParameters(MESSAGE_PROMPTS[promptKeyOrMessage].prompt, parameters)
        : this.replaceParameters(promptKeyOrMessage, parameters);

      const completion = await this.openai.chat.completions.create({
        model: (options?.model || process.env.MESSAGE_MODEL || this.defaultOptions.model) as string,
        messages: [
          { 
            role: 'system', 
            content: '당신은 채팅 테스트를 위한 메시지를 생성하는 도우미입니다. 자연스럽고 실제 사용자가 작성할 법한 메시지를 생성해주세요. 항상 한국어로 만들어주세요. ", \'는 사용하지 말아주세요.' 
          },
          { role: 'user', content: finalPrompt }
        ],
        temperature: options?.temperature ?? this.defaultOptions.temperature
      });

      return completion.choices[0]?.message?.content?.trim() || finalPrompt;
    } catch (error) {
      console.error('메시지 생성 중 오류 발생:', error);
      return promptKeyOrMessage;
    }
  }
}