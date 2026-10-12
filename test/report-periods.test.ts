import { test } from "node:test";
import assert from "node:assert/strict";
import {
  previousReportPeriod,
  reportPeriod,
} from "../packages/ui/src/report-period";

test("Report periods: daily and rolling ranges include today across year boundaries", () => {
  const range = (preset: "TODAY" | "DAYS_7" | "DAYS_30" | "DAYS_90") =>
    reportPeriod(preset, "2027-01-01", "2027-01", "", "");
  assert.deepEqual(range("TODAY"), { from: "2027-01-01", to: "2027-01-02" });
  assert.deepEqual(range("DAYS_7"), { from: "2026-12-26", to: "2027-01-02" });
  assert.deepEqual(range("DAYS_30"), { from: "2026-12-03", to: "2027-01-02" });
  assert.deepEqual(range("DAYS_90"), { from: "2026-10-04", to: "2027-01-02" });
});
test("Report periods: calendar months handle leap February and compare with the complete preceding month", () => {
  const month = reportPeriod("MONTH", "2028-02-29", "2028-02", "", "")!;
  assert.deepEqual(month, { from: "2028-02-01", to: "2028-03-01" });
  assert.deepEqual(previousReportPeriod(month, "MONTH"), {
    from: "2028-01-01",
    to: "2028-02-01",
  });
  assert.deepEqual(
    previousReportPeriod({ from: "2028-01-01", to: "2028-02-01" }, "MONTH"),
    { from: "2027-12-01", to: "2028-01-01" },
  );
});
test("Report periods: custom final date is inclusive and invalid or oversized dates do not issue requests", () => {
  assert.deepEqual(
    reportPeriod("CUSTOM", "2028-02-29", "", "2028-02-29", "2028-02-29"),
    { from: "2028-02-29", to: "2028-03-01" },
  );
  assert.equal(
    reportPeriod("CUSTOM", "2027-03-01", "", "2027-02-29", "2027-03-01"),
    null,
  );
  assert.equal(
    reportPeriod("CUSTOM", "2027-03-01", "", "2027-03-02", "2027-03-01"),
    null,
  );
  assert.equal(
    reportPeriod("CUSTOM", "2027-03-01", "", "2028-01-01", "2029-01-01"),
    null,
  );
  assert.equal(reportPeriod("MONTH", "2027-03-01", "2027-13", "", ""), null);
});
