export type AuthMeResponse = {
  id: string;
  email: string;
  createdAt: string;
};

export const mvpRequest = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);

  if (init?.body) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  const json = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(json.message ?? "Request failed");
  }

  return json;
};

export const getCurrentUser = async (): Promise<AuthMeResponse> => mvpRequest<AuthMeResponse>("/api/auth/me");

export const logout = async () => {
  await mvpRequest<{ success: true }>("/api/auth/logout", { method: "POST" });
};
