import assert from "node:assert/strict";
import test from "node:test";
import {
  PARTNER_TERMS_SECTIONS,
  PARTNER_TERMS_VERSION,
} from "../src/partner-terms";

test("partner terms rules define complete structured Uzbek rules and portal links", () => {
  assert.match(PARTNER_TERMS_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(PARTNER_TERMS_SECTIONS.length, 6);

  const ids = new Set<string>();
  const numbers = new Set<string>();
  for (const rule of PARTNER_TERMS_SECTIONS) {
    assert.ok(rule.id.length > 0 && !ids.has(rule.id));
    assert.ok(rule.number.length > 0 && !numbers.has(rule.number));
    ids.add(rule.id);
    numbers.add(rule.number);
    assert.ok(rule.title.trim().length > 5);
    assert.ok(rule.summary.trim().length > 15);
    assert.ok(rule.items.length >= 3);
    assert.ok(rule.section && rule.actionLabel);
  }
});
