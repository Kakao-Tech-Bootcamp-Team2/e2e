import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('메시징 테스트', () => {
  const helpers = new TestHelpers();
  
  // 테스트에 필요한 공통 변수들을 beforeAll에서 초기화
  let roomPrefix: string;
  let user1Creds: any;
  let user2Creds: any;

  test.beforeAll(() => {
    roomPrefix = 'Chat';
    user1Creds = helpers.getTestUser(Math.floor(Math.random() * 1001));
    user2Creds = helpers.getTestUser(1);
  });

  test('그룹 채팅 시나리오', async ({ browser }) => {
    // 페이지 객체 생성을 context로 변경하여 격리성 향상
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const user1 = await context1.newPage();
    const user2 = await context2.newPage();

    try {
      // 사용자 등록
      await Promise.all([
        helpers.registerUser(user1, user1Creds),
        helpers.registerUser(user2, user2Creds)
      ]);

      // 방 생성 및 입장
      const createdRoomName = await helpers.joinOrCreateRoom(user1, roomPrefix);
      const hostUrl = user1.url();
      const roomParam = new URL(hostUrl).searchParams.get('room');
      
      if (!roomParam) {
        throw new Error('방 이름을 URL에서 찾을 수 없습니다.');
      }

      await helpers.joinRoomByURLParam(user2, roomParam);

      // 동일한 채팅방 입장 확인
      await test.step('채팅방 입장 확인', async () => {
        for (const user of [user1, user2]) {
          const userRoomParam = new URL(user.url()).searchParams.get('room');
          expect(userRoomParam).toBe(roomParam);
        }
      });

      // 메시지 교환
      await test.step('메시지 교환', async () => {
        // 인사 메시지
        const [greeting1, greeting2] = await Promise.all([
          helpers.sendMessage(user1, 'GREETING', {
            USER_NAME: user1Creds.name,
            ROOM_NAME: roomParam
          }),
          helpers.sendMessage(user2, 'GREETING', {
            USER_NAME: user2Creds.name,
            ROOM_NAME: roomParam
          })
        ]);

        // 주제 토론
        const topic = '주말 계획';
        const message1 = await helpers.sendMessage(user1, 'GROUP_CHAT', {
          CURRENT_TOPIC: topic,
          USER_NAME: user1Creds.name
        });

        const message2 = await helpers.sendMessage(user2, 'CHAT_RESPONSE', {
          PREV_MESSAGE: message1,
          USER_NAME: user2Creds.name
        });

        // AI 응답 요청
        await helpers.sendAIMessage(user1, '우리의 대화를 요약해주세요.');
      });

      // 메시지 표시 확인
      await test.step('메시지 표시 확인', async () => {
        await expect(user1.locator('.message-content')).toBeVisible();
        await expect(user2.locator('.message-content')).toBeVisible();
        await expect(user1.locator('.message-ai')).toBeVisible();
      });

    } finally {
      // 리소스 정리
      await Promise.all([
        context1.close(),
        context2.close()
      ]);
    }
  });
});