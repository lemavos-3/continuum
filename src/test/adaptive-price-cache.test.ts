import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheAdaptivePrice, readCachedAdaptivePrice } from "@/lib/adaptive-price-cache";

describe("adaptive price cache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T20:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the last confirmed price for the selected language", () => {
    cacheAdaptivePrice("pt", "€7.90");

    expect(readCachedAdaptivePrice("pt")).toBe("€7.90");
    expect(readCachedAdaptivePrice("en")).toBeNull();
  });

  it("expires cached prices after twenty hours", () => {
    cacheAdaptivePrice("en", "$9.99");
    vi.advanceTimersByTime(20 * 60 * 60 * 1000 + 1);

    expect(readCachedAdaptivePrice("en")).toBeNull();
  });
});
