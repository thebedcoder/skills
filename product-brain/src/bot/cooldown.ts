
export function withinCooldown(lastRunTs: number, now: Date, cooldownHours: number): boolean {
  if (lastRunTs <= 0) return false;
  const ageHours = (now.getTime() / 1000 - lastRunTs) / 3600;
  return ageHours < cooldownHours;
}

export function inQuietHours(now: Date, quietHoursUtc: number[]): boolean {
  if (!quietHoursUtc || quietHoursUtc.length !== 2) return false;
  const start = quietHoursUtc[0]!;
  const end = quietHoursUtc[1]!;
  const h = now.getUTCHours();
  if (start <= end) return start <= h && h < end;
  return h >= start || h < end;
}
