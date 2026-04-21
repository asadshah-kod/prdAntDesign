import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_EXCLUDE_URLS = ['/api/token/', '/api/token/refresh/'];

const parseJwtExp = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string, bufferSeconds = 30): boolean => {
  const exp = parseJwtExp(token);
  if (!exp) return true;
  return exp <= Math.floor(Date.now() / 1000) + bufferSeconds;
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    const response = await fetch('/api/token/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return null;
    }

    const data = (await response.json()) as { access?: string };
    if (!data.access) return null;

    localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    return data.access;
  })()
    .catch(() => {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// 与后端约定的响应数据格式
interface ResponseStructure {
  success: boolean;
  data: any;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      if (success === false) {
        const error: any = new Error(errorMessage);
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType, data };
        throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                title: errorCode,
                description: errorMessage,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        message.error(`Response status:${error.response.status}`);
      } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        // \`error.request\` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        message.error('None response! Please retry.');
      } else {
        // 发送请求时出了点问题
        message.error('Request error, please retry.');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    async (config: RequestOptions) => {
      const nextConfig = { ...config };
      const requestUrl = nextConfig.url || '';
      const skipAuth = AUTH_EXCLUDE_URLS.some((url) => requestUrl.includes(url));
      if (skipAuth) return nextConfig;

      let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (accessToken && isTokenExpired(accessToken)) {
        accessToken = await refreshAccessToken();
      }

      if (accessToken) {
        nextConfig.headers = {
          ...(nextConfig.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        };
      }

      return nextConfig;
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      if (response.status === 401) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      return response;
    },
  ],
};
