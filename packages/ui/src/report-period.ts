export type ReportPreset =
  "TODAY" | "DAYS_7" | "DAYS_30" | "DAYS_90" | "MONTH" | "CUSTOM";
export type ReportPeriod = { from: string; to: string };
export function shiftDate(value: string, days: number) {
  return new Date(Date.parse(value) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function reportPeriod(
  preset: ReportPreset,
  today: string,
  month: string,
  customFrom: string,
  customTo: string,
): ReportPeriod | null {
  if (!validDate(today)) return null;
  if (preset === "MONTH") {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
    const from = `${month}-01`;
    return { from, to: shiftDate(from, 32).slice(0, 8) + "01" };
  }
  if (preset === "CUSTOM") {
    if (
      !validDate(customFrom) ||
      !validDate(customTo) ||
      customTo < customFrom ||
      Date.parse(customTo) - Date.parse(customFrom) >= 366 * 86400000
    )
      return null;
    return { from: customFrom, to: shiftDate(customTo, 1) };
  }
  const days = preset === "TODAY" ? 1 : Number(preset.slice(5));
  return { from: shiftDate(today, 1 - days), to: shiftDate(today, 1) };
}
export function previousReportPeriod(
  period: ReportPeriod,
  preset: ReportPreset,
): ReportPeriod {
  if (preset === "MONTH")
    return {
      from: shiftDate(period.from, -1).slice(0, 8) + "01",
      to: period.from,
    };
  const days = (Date.parse(period.to) - Date.parse(period.from)) / 86400000;
  return { from: shiftDate(period.from, -days), to: period.from };
}
