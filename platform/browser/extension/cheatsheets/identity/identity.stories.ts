import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import authTokenFlowSource from './auth-token-flow.ts?raw';
import webAuthFlowSource from './web-auth-flow.ts?raw';
import {
  createAuthTokenFlowExample,
  type AuthTokenFlowInstance,
  type AuthTokenFlowOptions,
  type AuthTokenFlowSnapshot,
  type AuthTokenState,
} from './auth-token-flow';
import {
  createWebAuthFlowExample,
  type WebAuthFlowInstance,
  type WebAuthFlowOptions,
  type WebAuthFlowSnapshot,
  type WebAuthRedirect,
  type WebAuthResponseType,
} from './web-auth-flow';

interface AuthTokenFlowArgs {
  interactive: boolean;
  tokenState: string;
}

interface WebAuthFlowArgs {
  responseType: string;
  redirectTarget: string;
  interactive: boolean;
}

const TOKEN_STATE_BY_LABEL: Record<string, AuthTokenState> = {
  缓存为空: 'empty',
  缓存有效: 'valid',
  缓存已过期: 'expired',
  服务端已吊销: 'revoked',
};

const RESPONSE_TYPE_BY_LABEL: Record<string, WebAuthResponseType> = {
  'response_type=token': 'token',
  'response_type=code': 'code',
};

const REDIRECT_BY_LABEL: Record<string, WebAuthRedirect> = {
  'getRedirectURL() 生成的 chromiumapp.org': 'chromiumapp',
  'http://localhost:3000/cb': 'other-origin',
  'chrome-extension://<id>/callback.html': 'extension-page',
};

const renderAuthTokenFlow = canvasStory({
  create: createAuthTokenFlowExample,
  apply(instance: AuthTokenFlowInstance, args: AuthTokenFlowArgs) {
    const options: AuthTokenFlowOptions = {
      interactive: args.interactive,
      tokenState: TOKEN_STATE_BY_LABEL[args.tokenState],
    };
    instance.update(options);
  },
  readout(snapshot: AuthTokenFlowSnapshot) {
    return [
      ['是否问用户', snapshot.promptText],
      ['getAuthToken 结果', snapshot.tokenText],
      ['受保护 API', snapshot.apiText],
    ];
  },
  captions: [
    'getAuthToken 缓存演算（模拟）',
    '演示令牌仅为示意，真实令牌由 Chrome 发放',
  ],
});

const renderWebAuthFlow = canvasStory({
  create: createWebAuthFlowExample,
  apply(instance: WebAuthFlowInstance, args: WebAuthFlowArgs) {
    const options: WebAuthFlowOptions = {
      responseType: RESPONSE_TYPE_BY_LABEL[args.responseType],
      redirectTarget: REDIRECT_BY_LABEL[args.redirectTarget],
      interactive: args.interactive,
    };
    instance.update(options);
  },
  readout(snapshot: WebAuthFlowSnapshot) {
    return [
      ['模式匹配', snapshot.matchText],
      ['凭据位置', snapshot.credentialText],
      ['窗口', snapshot.windowText],
    ];
  },
  captions: [
    'launchWebAuthFlow 授权流程演算（模拟）',
    'redirect_uri 未命中时拿不到任何凭据',
  ],
});

const meta = {
  id: 'identity',
  title: '进阶能力/用户身份',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const AuthTokenFlow: StoryObj<AuthTokenFlowArgs> = {
  args: {
    interactive: false,
    tokenState: '缓存为空',
  },
  argTypes: {
    interactive: {
      name: 'getAuthToken 的 interactive',
      description:
        'false 只读缓存，需要用户确认就直接失败；true 才可能弹授权 UI，但缓存命中时同样不弹。',
      control: { type: 'boolean' },
    },
    tokenState: {
      name: '前置缓存状态',
      description:
        'identity API 内存缓存里已有令牌时，interactive 不影响是否返回旧令牌。',
      control: { type: 'select' },
      options: ['缓存为空', '缓存有效', '缓存已过期', '服务端已吊销'],
    },
  },
  render: renderAuthTokenFlow,
  parameters: storySource(authTokenFlowSource),
};

export const WebAuthFlow: StoryObj<WebAuthFlowArgs> = {
  args: {
    responseType: 'response_type=token',
    redirectTarget: 'getRedirectURL() 生成的 chromiumapp.org',
    interactive: true,
  },
  argTypes: {
    responseType: {
      name: 'response_type',
      description: 'token 走片段回传凭据；code 还要再拿 client secret 换令牌。',
      control: { type: 'select' },
      options: ['response_type=token', 'response_type=code'],
    },
    redirectTarget: {
      name: 'redirect_uri 形态',
      description:
        '只有 https://<扩展 ID>.chromiumapp.org/* 会被 Chrome 交付给扩展。',
      control: { type: 'select' },
      options: [
        'getRedirectURL() 生成的 chromiumapp.org',
        'http://localhost:3000/cb',
        'chrome-extension://<id>/callback.html',
      ],
    },
    interactive: {
      name: 'launchWebAuthFlow 的 interactive',
      description:
        'false 时窗口在后台打开且限时，首次导航未完成整个流程即报错。',
      control: { type: 'boolean' },
    },
  },
  render: renderWebAuthFlow,
  parameters: storySource(webAuthFlowSource),
};
