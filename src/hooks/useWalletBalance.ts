import { useEffect, useState } from "react";
import { mvpRequest } from "@/lib/mvp-client";

const BALANCE_CACHE_KEY = "busmap.wallet.balance";
const BALANCE_CACHE_TIME = 30000; // 30 seconds

type CachedBalance = {
  userId: string;
  balance: number;
  timestamp: number;
};

const getCachedBalance = (userId: string): number | null => {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.localStorage.getItem(BALANCE_CACHE_KEY);
    if (!cached) return null;

    const data: CachedBalance = JSON.parse(cached);

    // Check if cache is still valid
    if (data.userId !== userId) return null;
    if (Date.now() - data.timestamp > BALANCE_CACHE_TIME) return null;

    return data.balance;
  } catch {
    return null;
  }
};

const setCachedBalance = (userId: string, balance: number) => {
  if (typeof window === "undefined") return;

  try {
    const data: CachedBalance = {
      userId,
      balance,
      timestamp: Date.now(),
    };
    window.localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore cache write errors
  }
};

export const useWalletBalance = (userId: string | undefined) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBalance(null);
      setIsLoading(false);
      return;
    }

    // 1. Try to use cached balance first
    const cachedBalance = getCachedBalance(userId);
    if (cachedBalance !== null) {
      setBalance(cachedBalance);
      setIsLoading(false);
    } else {
      setBalance(null);
      setIsLoading(true);
    }

    // 2. Fetch fresh balance in background
    const fetchBalance = async () => {
      try {
        const result = await mvpRequest<{ balance: number }>("/api/wallet/balance", undefined, userId);

        setBalance(result.balance);
        setCachedBalance(userId, result.balance);
        setError(null);
      } catch (err) {
        // If fetch fails, fallback to cached value
        const fallbackBalance = getCachedBalance(userId);
        if (fallbackBalance !== null) {
          setBalance(fallbackBalance);
        } else {
          setError(err instanceof Error ? err.message : "Lỗi tải số dư");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [userId]);

  const refetch = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const result = await mvpRequest<{ balance: number }>("/api/wallet/balance", undefined, userId);

      setBalance(result.balance);
      setCachedBalance(userId, result.balance);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải số dư");
    } finally {
      setIsLoading(false);
    }
  };

  return { balance, isLoading, error, refetch };
};
