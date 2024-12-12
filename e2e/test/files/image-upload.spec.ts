import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import path from 'path';

// 페이지 객체 정의
class ChatRoomPage {
  constructor(private page: Page) {}

  async waitForChatUI() {
    await this.page.waitForSelector('.chat-input-wrapper', {
      state: 'visible',
      timeout: 30000
    });
  }

  async uploadImage(imagePath: string) {
    const fileInput = await this.page.waitForSelector('input[type="file"]', {
      state: 'attached',
      timeout: 30000
    });
    await fileInput.setInputFiles(imagePath);
    
    // 프리뷰 대기 및 전송
    await this.page.waitForSelector('.file-preview-item img', { state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(1000);

    const submitButton = await this.page.waitForSelector(
      'button[type="submit"], .chat-input-actions button[title*="보내기"], .chat-input-actions button.send-button',
      { state: 'visible', timeout: 30000 }
    );
    await submitButton.waitForElementState('stable');
    await submitButton.click();
  }

  async waitForImageMessage() {
    await this.page.waitForSelector('.upload-progress', {
      state: 'detached',
      timeout: 30000
    }).catch(() => {});

    const imgElement = await this.page.locator('.message-content img').first();
    await expect(imgElement).toBeVisible({ timeout: 30000 });
    return imgElement;
  }
}

test.describe('이미지 업로드 테스트', () => {
  const helpers = new TestHelpers();

  test('이미지 업로드 및 공유', async ({ browser }) => {
    const roomPrefix = 'Image-Test';
    
    // 업로더와 뷰어 설정
    const uploader = await browser.newPage();
    const viewer = await browser.newPage();
    
    // 업로더 등록 및 방 생성
    const uploaderCreds = helpers.generateUserCredentials(1);
    await helpers.registerUser(uploader, uploaderCreds);
    
    // 방 생성 및 생성된 정확한 방 이름 저장
    const createdRoomName = await helpers.joinOrCreateRoom(uploader, roomPrefix);
    console.log(`Created room name: ${createdRoomName}`);

    // 생성된 방의 URL 파라미터 확인
    const uploaderUrl = uploader.url();
    const uploaderRoomParam = new URLSearchParams(new URL(uploaderUrl).search).get('room');
    
    if (!uploaderRoomParam) {
      throw new Error('Failed to get room name from uploader URL');
    }

    // 뷰어 등록 및 같은 방으로 입장
    const viewerCreds = helpers.generateUserCredentials(2);
    await helpers.registerUser(viewer, viewerCreds);
    await helpers.joinRoomByURLParam(viewer, uploaderRoomParam);

    // 양쪽 모두 동일한 채팅방에 있는지 확인
    for (const page of [uploader, viewer]) {
      const userHostUrl = page.url();
    	const userRoomParam = new URLSearchParams(new URL(userHostUrl).search).get('room');
      expect(userRoomParam).toBe(uploaderRoomParam);
    }

    const uploaderPage = new ChatRoomPage(uploader);
    const viewerPage = new ChatRoomPage(viewer);

    // 이미지 업로드 실행
    const imagePath = path.join(__dirname, '../fixtures/images/mufc_logo.png');
    await uploaderPage.waitForChatUI();
    await uploaderPage.uploadImage(imagePath);

    // 양쪽에서 이미지 수신 확인
    const [uploaderImg, viewerImg] = await Promise.all([
      uploaderPage.waitForImageMessage(),
      viewerPage.waitForImageMessage()
    ]);

    // 이미지 검증
    for (const imgElement of [uploaderImg, viewerImg]) {
      const imgSrc = await imgElement.getAttribute('src');
      expect(imgSrc).toBeTruthy();
      
      const dimensions = await imgElement.evaluate((img) => ({
        naturalWidth: (img as HTMLImageElement).naturalWidth,
        naturalHeight: (img as HTMLImageElement).naturalHeight
      }));
      
      expect(dimensions.naturalWidth).toBeGreaterThan(0);
      expect(dimensions.naturalHeight).toBeGreaterThan(0);

      // 이미지 드 상태 확인 개선
      await expect(async () => {
        const isLoaded = await imgElement.evaluate((img: HTMLImageElement) => 
          img.complete && img.naturalWidth > 0
        );
        expect(isLoaded).toBeTruthy();
      }).toPass({ timeout: 30000 });
    }

    // AI 이미지 분석 테스트 활성화
    await helpers.sendAIMessage(uploader, '방금 공유된 이미지는 어떤 이미지인가요?');
    const aiResponse = await uploader.waitForSelector('.message-ai', { 
      timeout: 60000,
      state: 'visible' 
    });
    const responseText = await aiResponse.textContent();
    expect(responseText?.toLowerCase(), 'AI 응답이 예상 키워드를 포함하지 않음').toMatch(
      /(image|picture|photo|file|uploaded)/i
    );

    // 리소스 정리
    await Promise.all([uploader.close(), viewer.close()]);
  });
});