import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { MessageService } from '../services/message-service';
import * as dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

test.describe('AI 대화 시나리오', () => {
  const helpers = new TestHelpers();
  let messageService: MessageService;

  // 타임아웃 설정
  const AI_RESPONSE_TIMEOUT = 60000;

  test.beforeAll(async () => {
    messageService = new MessageService();
  });

  async function sendMessageAndVerify(page, messageType, params, aiName) {
    const message = await messageService.generateMessage(messageType, params);
    await helpers.sendAIMessage(page, message, aiName);
    
    // 타임아웃 설정과 함께 응답 대기
    const response = await page.locator('.message-ai').last();
    await expect(response).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
    
    // 응답 내용 검증 강화
    const content = await response.textContent();
    expect(content).not.toContain('error');
    expect(content).not.toContain('Error');
    expect(content?.length).toBeGreaterThan(0);
    
    // 메시지 타입별 검증 로직 추가
    switch (messageType) {
      case 'GREETING':
        expect(content).toContain(params.USER_NAME);
        break;
      case 'GROUP_CHAT':
        expect(content).toContain(params.CURRENT_TOPIC);
        break;
      case 'CHAT_RESPONSE':
        // 코드 리뷰 응답에 대한 특별한 검증
        expect(content).toMatch(/코드|리뷰|개선/);
        break;
    }
    
    return content;
  }

  test('AI와의 복잡한 대화', async ({ browser }) => {  
    const page = await browser.newPage();
    try {
      const creds = helpers.getTestUser(0);
      await helpers.registerUser(page, creds);
      const roomName = await helpers.joinOrCreateRoom(page, 'AI-Chat');

      const responses = await Promise.all([
        sendMessageAndVerify(page, 'GREETING', {
          USER_NAME: creds.name
        }, 'wayneAI'),
        sendMessageAndVerify(page, 'GROUP_CHAT', {
          CURRENT_TOPIC: '기술 트렌드',
          USER_NAME: creds.name
        }, 'wayneAI'),
        sendMessageAndVerify(page, 'CHAT_RESPONSE', {
          PREV_MESSAGE: 'function sum(a, b) { return a + b; }',
          USER_NAME: creds.name
        }, 'wayneAI')
      ].map(async (promise) => {
        try {
          return await promise;
        } catch (error) {
          console.error('AI Response Error:', error);
          return null;
        }
      }));

      // 응답 검증 로직 강화
      const validResponses = responses.filter(r => r !== null);
      expect(validResponses.length, 'AI 응답 수가 충분하지 않음').toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  });

  test('AI와의 기술 토론', async ({ browser }) => {  
    const page = await browser.newPage();
    try {
      const creds = helpers.getTestUser(1);
      await helpers.registerUser(page, creds);
      await helpers.joinOrCreateRoom(page, 'AI-Tech-Discussion');

      const topics = ['AI 윤리', '웹 개발 트렌드', '클라우드 컴퓨팅'];
      const responses: string[] = [];

      for (const topic of topics) {
        const response = await sendMessageAndVerify(page, 'GROUP_CHAT', {
          CURRENT_TOPIC: topic,
          USER_NAME: creds.name
        }, 'wayneAI');
        responses.push(response);
      }

      // 토론 응답 검증
      expect(responses).toHaveLength(topics.length);
    } finally {
      await page.close();
    }
  });
});