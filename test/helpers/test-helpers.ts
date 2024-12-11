import { Page } from '@playwright/test';
import { UserCredential, TEST_USERS, AI_TEST_USERS } from '../data/credentials';
import { MessageService } from '../services/message-service';

export class TestHelpers {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  // 테스트 유저 생성 및 관리
  getTestUser(index: number): UserCredential {
    return TEST_USERS[index % TEST_USERS.length];
  }

  getAITestUser(type: 'gpt' | 'claude'): UserCredential {
    return type === 'gpt' ? AI_TEST_USERS[0] : AI_TEST_USERS[1];
  }

  generateUserCredentials(index: number): UserCredential {
    return {
      name: `Test User ${index}`,
      email: `test_user${index}@example.com`,
      password: 'TestPass123!'
    };
  }

  // 사용자 인증 관련
  async registerUser(page: Page, credentials: UserCredential): Promise<void> {
    // 기본 URL로 이동하고 페이지 로드 완료 대기
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');

    try {
      // 폼이 있는지 확인
      const formExists = await page.waitForSelector('form', {
        state: 'visible',
        timeout: 10000
      });

      if (!formExists) {
        throw new Error('회원가입 폼을 찾을 수 없습니다.');
      }

      // 디버깅을 위한 스크린샷
      await page.screenshot({ path: 'debug-form.png' });

      // 입력 필드가 나타날 때까지 대기 (타임아웃 증가)
      await Promise.all([
        page.waitForSelector('input[name="name"]', { state: 'visible', timeout: 10000 }),
        page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 10000 }),
        page.waitForSelector('input[name="password"]', { state: 'visible', timeout: 10000 }),
        page.waitForSelector('input[name="confirmPassword"]', { state: 'visible', timeout: 10000 })
      ]);

      // 폼 입력
      await page.fill('input[name="name"]', credentials.name);
      await page.fill('input[name="email"]', credentials.email);
      await page.fill('input[name="password"]', credentials.password);
      await page.fill('input[name="confirmPassword"]', credentials.password);

      // 폼 제출 및 리다이렉트 대기
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]')
      ]);

      // 등록 성공 확인
      await page.waitForURL('/chat-rooms', { timeout: 10000 });

    } catch (error) {
      console.error('회원가입 중 오류 발생:', error);
      // 현재 페이지 상태 디버깅을 위한 스크린샷
      await page.screenshot({ path: `error-${Date.now()}.png` });
      throw error;
    }
  }

  async login(page: Page, credentials: UserCredential): Promise<void> {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    try {
      await page.fill('input[name="email"]', credentials.email);
      await page.fill('input[name="password"]', credentials.password);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]')
      ]);

      // 로그인 성공 확인
      await page.waitForURL('/chat-rooms', { timeout: 10000 });
    } catch (error) {
      console.error('로그인 중 오류 발생:', error);
      await page.screenshot({ path: `login-error-${Date.now()}.png` });
      throw error;
    }
  }

  // 채팅방 관련
  async joinOrCreateRoom(page: Page, roomPrefix: string): Promise<string> {
    const timestamp = Date.now();
    const roomName = `${roomPrefix}-${timestamp}`;

    await page.fill('input[name="roomName"]', roomName);
    await page.click('button:has-text("입장")');
    
    // 채팅방 로딩 대기
    await page.waitForSelector('.chat-container', { timeout: 30000 });
    
    return roomName;
  }

  async joinRoomByURLParam(page: Page, roomParam: string | null): Promise<void> {
    if (!roomParam) {
      throw new Error('Room parameter is required');
    }

    await page.goto(`/chat?room=${roomParam}`);
    await page.waitForSelector('.chat-container', { timeout: 30000 });
  }

  // 메시지 전송 관련
  async sendMessage(page: Page, message: string): Promise<void> {
    await page.fill('.chat-input-textarea', message);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message-content:has-text("' + message + '")', {
      timeout: 30000
    });
  }

  async sendAIMessage(page: Page, message: string, aiType: 'wayneAI' | 'consultingAI' = 'wayneAI'): Promise<void> {
    await page.fill('.chat-input-textarea', message);
    await page.selectOption('select[name="aiType"]', aiType);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.message-ai', { timeout: 30000 });
  }
}