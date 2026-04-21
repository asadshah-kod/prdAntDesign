// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const parseJwtPayload = (token: string) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  try {
    return await request<{
      data: API.CurrentUser;
    }>('/api/currentUser', {
      method: 'GET',
      skipErrorHandler: true,
      ...(options || {}),
    });
  } catch {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      throw new Error('Unauthorized');
    }

    const payload = parseJwtPayload(accessToken);
    const username = payload?.username || payload?.user_name || payload?.email || 'User';
    return {
      data: {
        name: username,
        access: 'user',
      },
    };
  }
}

/** 退出登录 */
export async function outLogin(options?: { [key: string]: any }) {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  return {
    data: {},
    success: true,
    ...(options || {}),
  };
}

/** 登录接口 POST /api/token/ */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  try {
    const tokenResult = await request<API.JWTTokenResponse>('/api/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        username: body.username,
        password: body.password,
      },
      skipErrorHandler: true,
      ...(options || {}),
    });

    if (tokenResult?.access && tokenResult?.refresh) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokenResult.access);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokenResult.refresh);
      return {
        status: 'ok',
        type: body.type,
        currentAuthority: 'user',
      } as API.LoginResult;
    }

    return {
      status: 'error',
      type: body.type,
      currentAuthority: 'guest',
    } as API.LoginResult;
  } catch {
    return {
      status: 'error',
      type: body.type,
      currentAuthority: 'guest',
    } as API.LoginResult;
  }
}

/** 此处后端没有提供注释 GET /api/notices */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>('/api/notices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取规则列表 GET /api/rule */
export async function rule(
  params: {
    // query
    /** 当前的页码 */
    current?: number;
    /** 页面的容量 */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.RuleList>('/api/rule', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新规则 PUT /api/rule */
export async function updateRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'update',
      ...(options || {}),
    },
  });
}

/** 新建规则 POST /api/rule */
export async function addRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'post',
      ...(options || {}),
    },
  });
}

/** 删除规则 DELETE /api/rule */
export async function removeRule(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/rule', {
    method: 'POST',
    data: {
      method: 'delete',
      ...(options || {}),
    },
  });
}
