import assert from "node:assert/strict";
import test from "node:test";
import {
  USER_AI_SUPPORT_SECTIONS,
  USER_OFERTA_SECTIONS,
  USER_PRIVACY_SECTIONS,
  USER_REFUND_SECTIONS,
  USER_TERMS_DOCS,
  USER_TERMS_VERSION,
  getUserPolicyDoc,
} from "../src/user-terms";

test("user terms docs define complete Uzbek rules across all 4 policy categories", () => {
  assert.match(USER_TERMS_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(USER_TERMS_DOCS.length, 4);
  assert.equal(USER_OFERTA_SECTIONS.length, 8);
  assert.equal(USER_PRIVACY_SECTIONS.length, 6);
  assert.equal(USER_REFUND_SECTIONS.length, 6);
  assert.equal(USER_AI_SUPPORT_SECTIONS.length, 5);

  const docIds = new Set<string>();
  const ruleIds = new Set<string>();
  for (const doc of USER_TERMS_DOCS) {
    assert.ok(!docIds.has(doc.id));
    docIds.add(doc.id);
    assert.ok(doc.title.trim().length > 5);
    assert.ok(doc.subtitle.trim().length > 10);
    assert.equal(getUserPolicyDoc(doc.id).id, doc.id);

    const numbers = new Set<string>();
    for (const rule of doc.sections) {
      assert.ok(rule.id.length > 0 && !ruleIds.has(rule.id));
      assert.ok(rule.number.length > 0 && !numbers.has(rule.number));
      ruleIds.add(rule.id);
      numbers.add(rule.number);
      assert.ok(rule.title.trim().length > 5);
      assert.ok(rule.summary.trim().length > 15);
      assert.ok(rule.items.length >= 2);
      assert.ok(!rule.summary.includes("`"));
      for (const item of rule.items) {
        assert.ok(item.trim().length > 20);
        assert.ok(!item.includes("`"), `Unexpected backtick in rule ${rule.id}`);
      }
    }
  }
});
