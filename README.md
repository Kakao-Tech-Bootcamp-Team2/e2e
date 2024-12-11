# e2e

`e2e`는 Playwright를 사용하여 채팅 애플리케이션의 엔드 투 엔드 테스트를 수행하는 프로젝트입니다.

## 요구 사항

- Node.js (>=14.x)
- npm (>=6.x)

## 설치

1. 저장소를 클론합니다.
   ```bash
   git clone https://github.com/your-username/e2e-chat.git
   cd e2e-chat   ```

2. 필요한 패키지를 설치합니다.
   ```bash
   npm install   ```

3. 환경 변수를 설정합니다. `.env` 파일을 생성하고 필요한 API 키와 설정을 추가합니다.
   ```plaintext
   OPENAI_API_KEY=your_openai_api_key
   CLAUDE_API_KEY=your_claude_api_key   ```

## 테스트 실행

1. Playwright 테스트를 실행합니다.
   ```bash
   npx playwright test   ```

2. 특정 테스트 파일을 실행하려면 다음과 같이 명령어를 사용합니다.
   ```bash
   npx playwright test e2e-chat/test/debate/debate.spec.ts   ```

3. 테스트 결과를 HTML 리포트로 확인하려면 다음 명령어를 사용합니다.
   ```bash
   npx playwright show-report   ```

## 프로젝트 구조

- `e2e-chat/test`: 테스트 스크립트가 위치한 디렉토리입니다.
- `e2e-chat/test/helpers`: 테스트 유틸리티 함수들이 위치한 디렉토리입니다.
- `e2e-chat/test/services`: AI 및 메시지 서비스를 위한 모듈이 위치한 디렉토리입니다.
- `e2e-chat/test/data`: 테스트 데이터 및 프롬프트가 위치한 디렉토리입니다.
