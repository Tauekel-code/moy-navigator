function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** true, если nowHHmm попадает в окно [targetHHmm, targetHHmm + windowMinutes). */
export function isWithinWindow(nowHHmm: string, targetHHmm: string, windowMinutes: number): boolean {
  const now = toMinutes(nowHHmm);
  const target = toMinutes(targetHHmm);
  return now >= target && now < target + windowMinutes;
}
