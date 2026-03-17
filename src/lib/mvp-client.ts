export const USER_ID_STORAGE_KEY = "busmap.mvp.userId";

export const getStoredUserId = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(USER_ID_STORAGE_KEY) ?? "";
};

export const setStoredUserId = (userId: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_ID_STORAGE_KEY, userId);
};

export const clearStoredUserId = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(USER_ID_STORAGE_KEY);
};

export const mvpRequest = async <T>(url: string, init?: RequestInit, userId?: string): Promise<T> => {
  const headers = new Headers(init?.headers);

  if (userId) {
    headers.set("x-user-id", userId);
  }

  if (init?.body) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const json = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(json.message ?? "Request failed");
  }

  return json;
};
