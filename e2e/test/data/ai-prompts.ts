// test/data/ai-prompts.ts

export interface AIPrompt {
  category: string;
  purpose: string;
  prompt: string;
  parameters?: string[];
}

export const TEST_PROMPTS: Record<string, AIPrompt> = {
  GREETING: {
    category: 'Communication',
    purpose: '사용자 맞춤 인사',
    prompt: '안녕하세요! 저는 [AI_NAME]입니다. [USER_NAME]님, 오늘 어떤 도움이 필요하신가요?',
    parameters: ['AI_NAME', 'USER_NAME']
  },
  CODE_REVIEW: {
    category: 'Development',
    purpose: '코드 품질 검토 및 개선 제안',
    prompt: '다음 [LANGUAGE] 코드를 검토하여 버그, 성능, 가독성 측면에서 개선점을 제시해주세요:\n[CODE]',
    parameters: ['LANGUAGE', 'CODE']
  },
  BUSINESS_ADVICE: {
    category: 'Consulting',
    purpose: '비즈니스 조언',
    prompt: '[INDUSTRY] 산업에서 [TOPIC]에 대한 조언을 제공해주세요.',
    parameters: ['INDUSTRY', 'TOPIC']
  },
  DEBATE: {
    category: 'Discussion',
    purpose: '토론 진행',
    prompt: '[TOPIC]에 대해 [STANCE] 입장에서 논의를 진행해주세요.',
    parameters: ['TOPIC', 'STANCE']
  },
  ANALYSIS: {
    category: 'Analysis',
    purpose: '데이터 분석',
    prompt: '다음 [DATA_TYPE] 데이터를 분석하고 [FOCUS_POINT]에 대한 인사이트를 제공해주세요:\n[DATA]',
    parameters: ['DATA_TYPE', 'FOCUS_POINT', 'DATA']
  },
  ERROR_HANDLING: {
    category: 'Development',
    purpose: '에러 처리 방안 제시',
    prompt: '[CONTEXT]에서 발생한 [ERROR_TYPE] 에러의 처리 방안을 제시해주세요.',
    parameters: ['CONTEXT', 'ERROR_TYPE']
  }
};

// AI 응답 템플릿
export const AI_RESPONSE_TEMPLATES = {
  ERROR: {
    NO_RESPONSE: '죄송합니다. 일시적인 문제로 응답을 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    INVALID_PROMPT: '프롬프트 형식이 올바르지 않습니다. 필수 매개변수를 확인해 주세요.',
    API_ERROR: 'AI 서비스 연결 중 문제가 발생했습니다. 시스템 관리자에게 문의해 주세요.'
  },
  FALLBACK: {
    DEFAULT: '이해했습니다. 어떻게 도와드릴까요?',
    CLARIFICATION: '조금 더 자세히 설명해 주시겠어요?'
  }
};