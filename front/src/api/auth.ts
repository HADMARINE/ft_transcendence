import { client } from "./client";

export async function login(params: {
  email: string;
  password: string;
}): Promise<{ result: boolean; data: string }> {
  const response = await client.post<string>("/auth/login", params);
  if (response.result === true) {
    if (typeof window !== 'undefined') {
      localStorage.setItem("token", response.data);
    }
    return {
      result: true,
      data: response.data as string,
    };
  }
  return {
    result: false,
    data: (response.data?.message as string) || "Login failed",
  };
}

export async function register(params: {
  email: string;
  password: string;
  nickname: string;
}) {
  const response = await client.post("/users", params);
  if (response.result === true) {
    return {
      result: true,
    };
  }
  return {
    result: false,
    message: response.data?.message || "Registration failed",
  };
}

export async function logout(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem("token");
  }
  await client.post("/auth/logout");
}

export async function authStatus(): Promise<boolean> {
  const result = await client.get("/auth/verify/token");
  if (result.result === true) {
    return true;
  }
  return false;
}