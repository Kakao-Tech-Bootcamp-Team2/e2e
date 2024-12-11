import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('AI 축구 논쟁 테스트', () => {
  const helpers = new TestHelpers();

  test('메시 vs 호날두 논쟁', async ({ browser }) => {
    const roomPrefix = 'Football-Debate';
    
    // 사용자 페이지 생성
    const [messiSupporter, ronaldoSupporter] = await Promise.all([
      browser.newPage(),
      browser.newPage()
    ]);

    try {
      // GPT 사용자 (메시 지지자) 설정
      const messiCreds = helpers.getAITestUser('gpt');
      await helpers.registerUser(messiSupporter, messiCreds);
      
      // 메시 지지자가 방 생성 및 정확한 방 이름 저장
      const createdRoomName = await helpers.joinOrCreateRoom(messiSupporter, roomPrefix);
      console.log(`Created room name: ${createdRoomName}`);

      // 생성된 방의 URL 파라미터 확인
      const messiUrl = messiSupporter.url();
      const roomParam = new URLSearchParams(new URL(messiUrl).search).get('room');
      
      if (!roomParam) {
        throw new Error('Failed to get room name from URL');
      }

      // 호날두 지지자 설정 및 방 참여
      const ronaldoCreds = helpers.getAITestUser('claude');
      await helpers.registerUser(ronaldoSupporter, ronaldoCreds);
      await helpers.joinRoomByURLParam(ronaldoSupporter, roomParam);

      // 논쟁 주제 설정
      const debatePoints = [
        { messiPoint: '메시는 최고의 드리블러입니다.', ronaldoResponse: '호날두는 최고의 골잡이입니다.' },
        { messiPoint: '메시는 팀 플레이어입니다.', ronaldoResponse: '호날두는 결정적인 순간에 강합니다.' }
      ];

      // 논쟁 수행
      for (const { messiPoint, ronaldoResponse } of debatePoints) {
        await helpers.sendMessage(messiSupporter, messiPoint);
        await messiSupporter.waitForTimeout(2000); // 대화 간격을 위한 대기
        await helpers.sendMessage(ronaldoSupporter, ronaldoResponse);
        await ronaldoSupporter.waitForTimeout(2000);
      }

      // 모든 사용자가 동일한 채팅방에 있는지 확인
      for (const page of [messiSupporter, ronaldoSupporter]) {
        const userUrl = page.url();
        const userRoomParam = new URLSearchParams(new URL(userUrl).search).get('room');
        expect(userRoomParam).toBe(roomParam);
      }

    } finally {
      // 리소스 정리
      await Promise.all([messiSupporter.close(), ronaldoSupporter.close()]);
    }
  });
});