// test/profile/profile.spec.ts
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('프로필 테스트', () => {
  const helpers = new TestHelpers();
  let credentials;

  test.beforeEach(async ({ page }) => {
    credentials = helpers.generateUserCredentials(1);
    await helpers.registerUser(page, credentials);
    await page.goto('/profile');
  });

  test('기본 프로필 정보 수정', async ({ page }) => {
    // 프로필 정보 업데이트
    const newName = `Updated ${credentials.name}`;
    const newBio = '새로운 자기소개입니다.';
    
    await page.fill('input[id="name"]', newName);
    await page.fill('textarea[id="bio"]', newBio);
    await page.click('button:has-text("저장")');

    // 변경 확인
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.alert-success')).toBeVisible();
    await expect(page.locator('.alert-success')).toContainText('프로필이 업데이트되었습니다');
    
    await page.reload();
    await expect(page.locator('input[id="name"]')).toHaveValue(newName);
    await expect(page.locator('textarea[id="bio"]')).toHaveValue(newBio);
  });

  test('프로필 유효성 검사', async ({ page }) => {
    // 빈 이름 테스트
    await page.fill('input[id="name"]', '');
    await page.click('button:has-text("저장")');
    await expect(page.locator('.error-message')).toContainText('이름은 필수 항목입니다');

    // 너무 긴 이름 테스트
    const longName = 'a'.repeat(51);
    await page.fill('input[id="name"]', longName);
    await page.click('button:has-text("저장")');
    await expect(page.locator('.error-message')).toContainText('이름은 50자를 초과할 수 없습니다');
  });

  test('프로필 이미지 업로드', async ({ page }) => {
    // 이미지 업로드
    await page.setInputFiles('input[type="file"]', 'test-assets/profile.jpg');
    await page.click('button:has-text("저장")');

    // 업로드 확인
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.profile-image')).toBeVisible();
    await expect(page.locator('.alert-success')).toContainText('프로필이 업데이트되었습니다');
  });
});