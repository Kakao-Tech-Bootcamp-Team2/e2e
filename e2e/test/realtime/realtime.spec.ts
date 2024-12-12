// test/realtime/realtime.spec.ts
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('실시간 기능 테스트', () => {
  const helpers = new TestHelpers();

  test('실시간 참여자 상태 업데이트', async ({ browser }) => {    
    // 방장
    const host = await browser.newPage();
    const hostCreds = helpers.generateUserCredentials(Math.floor(Math.random() * 1001));
    await helpers.registerUser(host, hostCreds);
    const roomName = await helpers.joinOrCreateRoom(host, 'Realtime');
    const hostUrl = host.url();
    const hostRoomParam = new URLSearchParams(new URL(hostUrl).search).get('room');
    
    if (!hostRoomParam) {
      throw new Error('방 이름을 URL에서 찾을 수 없습니다.');
    }
    
    // 참여자들 생성 및 참여
    const participants: Array<Awaited<ReturnType<typeof browser.newPage>>> = [];
    for (let i = 0; i < 3; i++) {
      try {
        const page = await browser.newPage();
        const creds = helpers.generateUserCredentials(Math.floor(Math.random() * 1001));
        await helpers.registerUser(page, creds);
        await helpers.joinRoomByURLParam(page, hostRoomParam);
        
        // 참여 성공 확인
        await expect(page.locator('.room-container')).toBeVisible();
        participants.push(page);
      } catch (error) {
        console.error(`참여자 ${i + 1} 생성 실패:`, error);
        throw error; // 테스트 실패 처리
      }
    }
    
    // 모든 참여자가 보이는지 확인
    await expect(host.locator('.participants-count')).toContainText('4');
    
    try {
      // 참여자 목록에 모든 사용자가 표시되는지 확인
      for (const participant of participants) {
        await expect(participant.locator('.participants-list')).toHaveCount(4);
      }

      // 한 명이 나가기
      if (participants[0]) {
        await participants[0].close();
        await host.waitForTimeout(1000); // 상태 업데이트 대기
      }
      
      // 참여자 수 업데이트 확인
      await expect(host.locator('.participants-count')).toContainText('3');
      
      // 남은 참여자들의 목록도 업데이트되었는지 확인
      for (const participant of participants.slice(1)) {
        await expect(participant.locator('.participants-list')).toHaveCount(3);
      }
    } finally {
      // 리소스 정리
      await Promise.all([
        host.close(),
        ...participants.slice(1).map(p => p?.close() || Promise.resolve())
      ]);
    }
  });
});