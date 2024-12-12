import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('인증 테스트', () => {
  const helpers = new TestHelpers();
  const TIMEOUT = 30000;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('회원가입 및 로그인 흐름', async ({ page }) => {
    const credentials = helpers.generateUserCredentials(1);
    
    // 1. 회원가입
    await helpers.registerUser(page, credentials);
    
    // 채팅방 목록 페이지 확인
    await expect(page).toHaveURL('/chat-rooms');
    
    // 채팅방 목록 페이지의 필수 요소들이 로드되었는지 확인
    await expect(page.locator('.chat-rooms-card')).toBeVisible({ timeout: TIMEOUT });

    // 채팅방 목록 헤더 텍스트 확인 (Card.Title 사용)
    await expect(page.locator('h5')).toHaveText('채팅방 목록');
    
    // 연결 상태 확인
    await expect(page.locator('.text-success')).toBeVisible();
    await expect(page.locator('.text-success')).toHaveText('연결됨');
  });

  test('로그인 실패 케이스', async ({ page }) => {
    const invalidCredentials = {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    };

    await page.fill('input[name="email"]', invalidCredentials.email);
    await page.fill('input[name="password"]', invalidCredentials.password);

    // 폼 제출 및 에러 응답 대기
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/login') && 
      response.status() === 401
    );
    
    await page.click('button[type="submit"]');
    const response = await responsePromise;
    
    // 에러 메시지 확인
    await expect(page.locator('.alert.alert-danger')).toBeVisible({ timeout: TIMEOUT });

    // 재시도 로직 추가
    let retryCount = 3;
    while (retryCount > 0) {
      try {
        await expect(page.locator('.alert.alert-danger')).toHaveText(
          '이메일 또는 비밀번호가 올바르지 않습니다.',
          { timeout: 5000 }
        );
        break;
      } catch (error) {
        retryCount--;
        if (retryCount === 0) throw error;
        await page.waitForTimeout(1000);
      }
    }
  });

  test('회원가입 유효성 검사', async ({ page }) => {
    await page.goto('/register');

    // 각 필드별 유효성 검사
    const testCases = [
      {
        data: { name: '', email: '', password: '', confirmPassword: '' },
        expectedError: '모든 필드를 입력해주세요.'
      },
      {
        data: { 
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
          confirmPassword: 'password123'
        },
        expectedError: '올바른 이메일 형식이 아닙니다.'
      }
    ];

    for (const testCase of testCases) {
      await page.fill('input[name="name"]', testCase.data.name);
      await page.fill('input[name="email"]', testCase.data.email);
      await page.fill('input[name="password"]', testCase.data.password);
      await page.fill('input[name="confirmPassword"]', testCase.data.confirmPassword);

      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/auth/register') && 
        response.status() === 400
      );
      
      await page.click('button[type="submit"]');
      await responsePromise;

      const errorElement = page.locator('.alert.alert-danger');
      await expect(errorElement).toBeVisible({ timeout: TIMEOUT });
      await expect(errorElement).toHaveText(testCase.expectedError);
    }
  });
});