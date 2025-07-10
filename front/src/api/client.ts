import axios, {
  Axios,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { setupCache } from "axios-cache-interceptor";

type ResponseResult<T, U extends boolean = boolean> =
  | {
      result: true;
      data: T;
      raw: AxiosResponse<T>;
    }
  | {
      result: false;
      data: Record<string, any> | null;
      raw: AxiosError<T>;
    };

function customClient() {
  const baseClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URI,
    withCredentials: true,
  });

  async function resolver<T>(
    config: Parameters<typeof baseClient.request<T>>[0]
  ): Promise<ResponseResult<T>> {
    try {
      const res = await baseClient.request(config);
      return {
        result: true,
        data: res.data,
        raw: res,
      };
    } catch (e: unknown) {
      if (!(e instanceof AxiosError)) {
        throw e;
      }

      if (e.response) {
        return {
          result: false,
          data: e.response?.data || {},
          raw: e,
        };
      } else if (e.request) {
        console.error(e.request);
        return {
          result: false,
          data: null,
          raw: e,
        };
      } else {
        console.error("Axios Error", e.message);
        return {
          result: false,
          data: null,
          raw: e,
        };
      }
    }
  }

  const eqbClient = {
    request: <T = any>(
      config: Parameters<typeof resolver<T>>[0]
    ): Promise<ResponseResult<T>> => resolver(config),
    get: <T = any>(
      url: string,
      config?: Parameters<typeof resolver<T>>[0]
    ): Promise<ResponseResult<T>> =>
      resolver({
        ...config,
        url,
        method: "get",
      }),
    delete: <T = any>(
      url: string,
      config?: Parameters<typeof resolver<T>>[0]
    ): Promise<ResponseResult<T>> =>
      resolver({ ...config, url, method: "delete" }),
    head: <T = any>(
      url: string,
      config?: Parameters<typeof resolver<T>>[0]
    ): Promise<ResponseResult<T>> =>
      resolver({ ...config, url, method: "head" }),
    options: <T = any>(
      url: string,
      config?: Parameters<typeof resolver<T>>[0]
    ): Promise<ResponseResult<T>> =>
      resolver({ ...config, url, method: "options" }),
    post: async <T = any>(
      url: string,
      data?: any,
      config?: Parameters<typeof resolver<T>>[0]
    ): Promise<ResponseResult<T>> =>
      resolver({ ...config, url, data, method: "post" }),
    put: <T = any>(
      url: string,
      data?: any,
      config?: Parameters<typeof resolver<T>>[0]
    ): Promise<ResponseResult<T>> =>
      resolver({ ...config, url, data, method: "put" }),
    patch: <T = any>(
      url: string,
      data?: any,
      config?: Parameters<typeof resolver<T>>[0]
    ): Promise<ResponseResult<T>> =>
      resolver({ ...config, url, data, method: "patch" }),
  };
  return eqbClient;
}

export const client = customClient();
