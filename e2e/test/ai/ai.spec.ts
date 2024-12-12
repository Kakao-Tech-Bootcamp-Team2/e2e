// test/ai/ai.spec.ts
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('AI 상호작용 테스트', () => {
  const helpers = new TestHelpers();
  const AI_RESPONSE_TIMEOUT = 30000;

  async function verifyAIResponse(page, expectedKeywords: string[] = []) {
    const response = await page.locator('.message-ai').last();
    await expect(response).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
    
    if (expectedKeywords.length > 0) {
      const content = await response.textContent();
      for (const keyword of expectedKeywords) {
        expect(content).toContain(keyword);
      }
    }
  }

  test('다양한 AI와의 대화', async ({ browser }) => {
    const page = await browser.newPage();
    try {
      // 사용자 등록 및 채팅방 생성
      const credentials = helpers.getTestUser(Math.floor(Math.random() * 1001));
      await helpers.registerUser(page, credentials);
      const roomName = await helpers.joinOrCreateRoom(page, 'AI-Test');
      
      // Wayne AI와 대화
      await helpers.sendAIMessage(page, '안녕하세요', 'wayneAI');
      await verifyAIResponse(page, ['안녕']);
      
      // Consulting AI와 대화
      await helpers.sendAIMessage(page, '비즈니스 조언이 필요해요', 'consultingAI');
      await verifyAIResponse(page, ['비즈니스', '조언']);
      
      // 기본값(wayneAI) 사용
      await helpers.sendAIMessage(page, '감사합니다');
      await verifyAIResponse(page, ['감사']);

      // 전체 메시지 개수 확인
      const allMessages = await page.locator('.message-ai').all();
      expect(allMessages).toHaveLength(3);
    } finally {
      await page.close();
    }
  });

  test('AI 응답 시간 테스트', async ({ browser }) => {
    const page = await browser.newPage();
    try {
      const credentials = helpers.getTestUser(Math.floor(Math.random() * 1001));
      await helpers.registerUser(page, credentials);
      await helpers.joinOrCreateRoom(page, 'AI-Performance-Test');

      // AI 응답 시간 측정
      const startTime = Date.now();
      await helpers.sendAIMessage(page, '안녕하세요', 'wayneAI');
      await verifyAIResponse(page);
      const responseTime = Date.now() - startTime;

      // 응답 시간이 지정된 타임아웃보다 작은지 확인
      expect(responseTime).toBeLessThan(AI_RESPONSE_TIMEOUT);
    } finally {
      await page.close();
    }
  });
});