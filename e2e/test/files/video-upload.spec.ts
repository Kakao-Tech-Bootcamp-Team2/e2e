import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';
import path from 'path';

class ChatRoomPage {
  constructor(private page: Page) {}

  async waitForChatUI() {
    await this.page.waitForSelector('.chat-input-wrapper', {
      state: 'visible',
      timeout: 30000
    });
  }

  async uploadVideo(videoPath: string) {
    const fileInput = await this.page.waitForSelector('input[type="file"]', {
      state: 'attached',
      timeout: 30000
    });
    await fileInput.setInputFiles(videoPath);
    
    // 비디오 프리뷰 대기
    await this.page.waitForSelector('.file-preview-item video', {
      state: 'visible',
      timeout: 30000
    });
    await this.page.waitForTimeout(1000);

    const submitButton = await this.page.waitForSelector(
      'button[type="submit"], .chat-input-actions button[title*="보내기"], .chat-input-actions button.send-button',
      { state: 'visible', timeout: 30000 }
    );
    await submitButton.waitForElementState('stable');
    await submitButton.click();
  }

  async waitForVideoMessage() {
    await this.page.waitForSelector('.upload-progress', {
      state: 'detached',
      timeout: 30000
    }).catch(() => {});

    const videoMessage = this.page.locator('.message-content:has(video)').last();
    await expect(videoMessage).toBeVisible({ timeout: 30000 });
    return videoMessage;
  }

  async verifyVideoMessage(videoMessage: any) {
    // 비디오 플레이어 확인
    const videoPlayer = videoMessage.locator('video');
    await expect(videoPlayer).toBeVisible({ timeout: 30000 });
    await expect(videoPlayer).toHaveAttribute('controls', '', { timeout: 30000 });

    // 비디오 메타데이터 로드 확인
    await expect(async () => {
      const isLoaded = await videoPlayer.evaluate((video: HTMLVideoElement) => 
        video.readyState >= 1
      );
      expect(isLoaded).toBeTruthy();
    }).toPass({ timeout: 30000 });

    // 비디오 컨트롤러 확인
    const controls = videoMessage.locator('.video-controls');
    await expect(controls).toBeVisible({ timeout: 30000 });

    // 재생 버튼 확인
    const playButton = controls.locator('.play-button');
    await expect(playButton).toBeVisible({ timeout: 30000 });
  }

  async testVideoPlayback(videoMessage: any) {
    const videoPlayer = videoMessage.locator('video');
    const playButton = videoMessage.locator('.video-controls .play-button');

    // 재생 테스트
    await playButton.click();
    await expect(videoPlayer).toHaveAttribute('data-playing', 'true', { timeout: 30000 });
    
    // 잠시 재생
    await this.page.waitForTimeout(2000);

    // 일시정지 테스트
    await playButton.click();
    await expect(videoPlayer).toHaveAttribute('data-playing', 'false', { timeout: 30000 });
  }
}

test.describe('비디오 업로드 테스트', () => {
  const helpers = new TestHelpers();

  test('비디오 파일 업로드 및 재생', async ({ browser }) => {
    const roomPrefix = 'Video-Test';
    
    // 업로더와 뷰어 설정
    const uploader = await browser.newPage();
    const viewer = await browser.newPage();
    
    // 업로더 등록 및 방 생성
    const uploaderCreds = helpers.generateUserCredentials(1);
    await helpers.registerUser(uploader, uploaderCreds);
    const createdRoomName = await helpers.joinOrCreateRoom(uploader, roomPrefix);
    
    // URL 파라미터 확인
    const uploaderUrl = uploader.url();
    const uploaderRoomParam = new URLSearchParams(new URL(uploaderUrl).search).get('room');
    if (!uploaderRoomParam) {
      throw new Error('Failed to get room name from uploader URL');
    }

    // 뷰어 설정
    const viewerCreds = helpers.generateUserCredentials(2);
    await helpers.registerUser(viewer, viewerCreds);
    await helpers.joinRoomByURLParam(viewer, uploaderRoomParam);

    const uploaderPage = new ChatRoomPage(uploader);
    const viewerPage = new ChatRoomPage(viewer);

    // 비디오 업로드
    const videoPath = path.join(__dirname, '../fixtures/media/mp4-test.mp4');
    await uploaderPage.waitForChatUI();
    await uploaderPage.uploadVideo(videoPath);

    // 양쪽에서 비디오 메시지 수신 확인
    const [uploaderVideoMsg, viewerVideoMsg] = await Promise.all([
      uploaderPage.waitForVideoMessage(),
      viewerPage.waitForVideoMessage()
    ]);

    // 비디오 메시지 검증
    await Promise.all([
      uploaderPage.verifyVideoMessage(uploaderVideoMsg),
      viewerPage.verifyVideoMessage(viewerVideoMsg)
    ]);

    // 비디오 재생 테스트 (업로더 측에서)
    await uploaderPage.testVideoPlayback(uploaderVideoMsg);

    // AI 비디오 분석 테스트
    await helpers.sendAIMessage(uploader, '방금 공유된 비디오 파일의 정보를 알려주세요.');
    const aiResponse = await uploader.waitForSelector('.message-ai', { timeout: 30000 });
    const responseText = await aiResponse.textContent();
    expect(responseText?.toLowerCase()).toMatch(/video|mp4|media/i);

    // 리소스 정리
    await Promise.all([uploader.close(), viewer.close()]);
  });
});