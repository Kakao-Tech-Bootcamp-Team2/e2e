// test/error/error-handling.spec.ts
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('에러 처리 테스트', () => {
  const helpers = new TestHelpers();

  test('네트워크 에러 복구', async ({ browser }) => {   
    const page = await browser.newPage();
    const creds = helpers.generateUserCredentials(1);
    await helpers.registerUser(page, creds);
    await helpers.joinOrCreateRoom(page, 'ErrorHandling');

    // 네트워크 차단
    await page.route('**/*', route => route.abort('failed'));
    
    // 에러 메시지 확인 전 대기 시간 추가
    await page.waitForTimeout(2000);
    
    const errorElement = page.locator('.connection-error');
    await expect(errorElement, '연결 끊김 에러 메시지가 표시되지 않음').toBeVisible({ 
      timeout: 20000 
    });
    
    // 재연결 시도 확인
    await page.unroute('**/*');
    await expect(page.locator('.reconnection-status')).toBeVisible({
      timeout: 20000
    });
  });

  test('중복 로그인 처리', async ({ browser }) => {
    const creds = helpers.generateUserCredentials(1);
    
    // 첫 번째 세션
    const session1 = await browser.newPage();
    await helpers.registerUser(session1, creds);
    await session1.waitForLoadState('networkidle');
    
    // 두 번째 세션으로 로그인
    const session2 = await browser.newPage();
    await helpers.login(session2, creds);
    
    // 첫 번째 세션에서 중복 로그인 알림 확인
    await expect(session1.locator('.duplicate-login-modal')).toBeVisible({
      timeout: 15000
    });

    // 모달 내용 검증
    const modalText = await session1.locator('.duplicate-login-modal').textContent();
    expect(modalText).toContain('다른 기기에서 로그인되었습니다');
    expect(modalText).toContain('지금 로그아웃');
    
    // 강제 로그아웃 확인
    await session1.locator('.duplicate-login-modal .logout-button').click();
    await expect(session1.locator('.login-page')).toBeVisible();
    
    // 정리
    await session1.close();
    await session2.close();
  });
});
