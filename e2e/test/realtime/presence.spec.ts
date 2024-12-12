// test/realtime/presence.spec.ts
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('실시간 상태 테스트', () => {
  const helpers = new TestHelpers();

  test('사용자 상태 및 타이핑 표시', async ({ browser }) => {   
    // 첫 번째 사용자
    const user1 = await browser.newPage();
    const user1Creds = helpers.generateUserCredentials(Math.floor(Math.random() * 1001));
    await helpers.registerUser(user1, user1Creds);
    const roomName = await helpers.joinOrCreateRoom(user1, 'Presence');
    const user1Url = user1.url();
    const user1RoomParam = new URLSearchParams(new URL(user1Url).search).get('room');
    
    if (!user1RoomParam) {
      throw new Error('방 이름을 URL에서 찾을 수 없습니다.');
    }

    // 두 번째 사용자
    const user2 = await browser.newPage();
    const user2Creds = helpers.generateUserCredentials(Math.floor(Math.random() * 1001));
    await helpers.registerUser(user2, user2Creds);
    await helpers.joinRoomByURLParam(user2, user1RoomParam);

    // 타이핑 표시 확인
    await user1.fill('.chat-input-textarea', 'typing...');
    await expect(user2.locator('.typing-indicator'))
      .toBeVisible({ timeout: 5000 });
    
    // 타이핑 중지 시 표시 사라짐 확인
    await user1.fill('.chat-input-textarea', '');
    await expect(user2.locator('.typing-indicator'))
      .toBeHidden({ timeout: 5000 });

    // 탭 전환 시 상태 변경 확인
    await user1.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await expect(user2.locator(`[data-user-id="${user1Creds.email}"] .status-away`))
      .toBeVisible({ timeout: 5000 });

    // 탭 복귀 시 상태 변경 확인
    await user1.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await expect(user2.locator(`[data-user-id="${user1Creds.email}"] .status-online`))
      .toBeVisible({ timeout: 5000 });

    // 정리
    await user1.close();
    await user2.close();
  });
});
