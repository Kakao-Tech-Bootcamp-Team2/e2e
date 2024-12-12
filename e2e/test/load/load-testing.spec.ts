// test/load/load-testing.spec.ts
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('부하 테스트', () => {
  const helpers = new TestHelpers();

  test('대량 메시지 처리', async ({ browser }) => {   
    const page = await browser.newPage();
    const creds = helpers.generateUserCredentials(1);
    await helpers.registerUser(page, creds);
    await helpers.joinOrCreateRoom(page, 'Load-Test');

    // 성능 측정을 위한 시작 시간 기록
    const startTime = Date.now();

    // Promise.all을 사용하여 메시지를 병렬로 전송
    const messages = Array.from({ length: 100 }, (_, i) => `Load test message ${i + 1}`);
    await Promise.all(messages.map(message => helpers.sendMessage(page, message)));

    // 실행 시간 측정
    const executionTime = Date.now() - startTime;
    console.log(`메시지 전송 실행 시간: ${executionTime}ms`);

    // 스크롤 동작 검증 추가
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForSelector('.message-content >> nth=0');
    
    // 메시지 검증 로직 개선
    const messageContents = await page.locator('.message-content').allTextContents();
    expect(messageContents).toHaveLength(100);
    expect(messageContents[0]).toContain('Load test message 1');
    expect(messageContents[messageContents.length - 1]).toContain('Load test message 100');

    // 성능 관련 assertions 추가
    expect(executionTime).toBeLessThan(10000); // 10초 이내 실행 검증
  });

  // 새로운 테스트 케이스 추가
  test('동시 사용자 접속 테스트', async ({ browser }) => {
    const CONCURRENT_USERS = 5;
    const pages = await Promise.all(
      Array.from({ length: CONCURRENT_USERS }, () => browser.newPage())
    );

    await Promise.all(pages.map(async (page, index) => {
      const creds = helpers.generateUserCredentials(index + 1);
      await helpers.registerUser(page, creds);
      await helpers.joinOrCreateRoom(page, 'Load-Test');
    }));

    // 각 사용자가 동시에 메시지 전송
    await Promise.all(pages.map((page, index) => 
      helpers.sendMessage(page, `Concurrent message from user ${index + 1}`)
    ));
  });
});
