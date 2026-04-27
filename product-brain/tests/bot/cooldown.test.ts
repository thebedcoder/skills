import { describe, expect, it } from "vitest";
import { inQuietHours, withinCooldown } from "../../src/bot/cooldown.js";

describe("withinCooldown", () => {
  it("returns false for zero or negative last-run", () => {
    expect(withinCooldown(0, new Date(), 24)).toBe(false);
    expect(withinCooldown(-1, new Date(), 24)).toBe(false);
  });

  it("returns true within window", () => {
    const now = new Date("2026-04-01T12:00:00Z");
    const oneHourAgo = now.getTime() / 1000 - 3600;
    expect(withinCooldown(oneHourAgo, now, 24)).toBe(true);
  });

  it("returns false past window", () => {
    const now = new Date("2026-04-01T12:00:00Z");
    const fiftyHoursAgo = now.getTime() / 1000 - 50 * 3600;
    expect(withinCooldown(fiftyHoursAgo, now, 24)).toBe(false);
  });
});

describe("inQuietHours", () => {
  it("returns false when not configured", () => {
    expect(inQuietHours(new Date(), [])).toBe(false);
  });

  it("handles normal range (start < end)", () => {
    expect(inQuietHours(new Date("2026-04-01T05:00:00Z"), [4, 8])).toBe(true);
    expect(inQuietHours(new Date("2026-04-01T08:00:00Z"), [4, 8])).toBe(false);
    expect(inQuietHours(new Date("2026-04-01T03:00:00Z"), [4, 8])).toBe(false);
  });

  it("handles wrap-around range (start > end)", () => {
    // quiet 22:00-07:00 UTC
    expect(inQuietHours(new Date("2026-04-01T23:00:00Z"), [22, 7])).toBe(true);
    expect(inQuietHours(new Date("2026-04-01T05:00:00Z"), [22, 7])).toBe(true);
    expect(inQuietHours(new Date("2026-04-01T12:00:00Z"), [22, 7])).toBe(false);
  });

  it("returns false for malformed config", () => {
    expect(inQuietHours(new Date(), [22] as unknown as number[])).toBe(false);
  });
});
