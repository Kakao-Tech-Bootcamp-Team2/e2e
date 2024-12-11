import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import { MessageService } from '../services/message-service';

test.describe('채팅방 테스트', () => {
  const helpers = new TestHelpers();
  let messageService: MessageService;

  test.beforeAll(async () => {
    messageService = new MessageService();
  });

  test('여러 사용자간 실시간 채팅', async ({ browser }) => {
    const roomPrefix = 'Chat';
    
    // 사용자들의 브라우저 컨텍스트 생성
    const [user1, user2, user3] = await Promise.all([
      browser.newPage(),
      browser.newPage(),
      browser.newPage()
    ]);

    try {
      // 사용자 자격증명 생성
      const credentials = [1, 2, 3].map(i => helpers.generateUserCredentials(i));

      // 각 사용자 등록
      await Promise.all(
        [user1, user2, user3].map((page, i) => 
          helpers.registerUser(page, credentials[i])
        )
      );

      // 첫 번째 사용자가 방 생성
      const roomName = await helpers.joinOrCreateRoom(user1, roomPrefix);
      const roomUrl = user1.url();
      const roomParam = new URLSearchParams(new URL(roomUrl).search).get('room');

      if (!roomParam) {
        throw new Error('채팅방 생성 실패: URL 파라미터를 찾을 수 없습니다.');
      }

      // 나머지 사용자들 방 참여
      await Promise.all([
        helpers.joinRoomByURLParam(user2, roomParam),
        helpers.joinRoomByURLParam(user3, roomParam)
      ]);

      // 각 사용자가 순차적으로 메시지 전송
      for (let i = 0; i < 3; i++) {
        const currentUser = [user1, user2, user3][i];
        const message = await messageService.generateMessage('GREETING', {
          USER_NAME: credentials[i].name,
          ROOM_NAME: roomName
        });
        await helpers.sendMessage(currentUser, message);
      }

      // 모든 사용자의 화면에 메시지가 표시되는지 확인
      for (const user of [user1, user2, user3]) {
        await expect(user.locator('.message-content')).toHaveCount(3);
      }

      // 파일 공유 테스트
      const fileInput = await user1.locator('input[type="file"]');
      await fileInput.setInputFiles('test/fixtures/test-image.png');
      await expect(user1.locator('.file-preview')).toBeVisible();

      // 이모지 반응 테스트
      const lastMessage = user2.locator('.message-content').last();
      await lastMessage.hover();
      await user2.click('.reaction-button');
      await user2.click('.emoji-picker button:first-child');

      // 반응이 모든 사용자에게 표시되는지 확인
      for (const user of [user1, user2, user3]) {
        await expect(user.locator('.reaction-badge')).toBeVisible();
      }

    } finally {
      // 리소스 정리
      await Promise.all([
        user1.close(),
        user2.close(),
        user3.close()
      ]);
    }
  });

  test('채팅방 기능 테스트', async ({ browser }) => {
    const page = await browser.newPage();
    const credentials = helpers.generateUserCredentials(1);
    
    try {
      await helpers.registerUser(page, credentials);
      const roomName = await helpers.joinOrCreateRoom(page, 'Function-Test');

      // 채팅방 UI 요소 확인
      await expect(page.locator('.chat-header')).toBeVisible();
      await expect(page.locator('.chat-input')).toBeVisible();
      await expect(page.locator('.participants-list')).toBeVisible();

      // 메시지 입력 및 전송
      const testMessage = '테스트 메시지입니다.';
      await helpers.sendMessage(page, testMessage);
      
      // 메시지 표시 확인
      const messageElement = page.locator('.message-content').last();
      await expect(messageElement).toContainText(testMessage);

      // 메시지 수정 기능
      await messageElement.hover();
      await page.click('.edit-message-button');
      const editedMessage = '수정된 메시지입니다.';
      await page.fill('.message-edit-input', editedMessage);
      await page.keyboard.press('Enter');
      await expect(messageElement).toContainText(editedMessage);

    } finally {
      await page.close();
    }
  });
});