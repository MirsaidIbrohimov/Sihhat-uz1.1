import assert from "node:assert/strict";
import test from "node:test";
import { formatBrSearchQuery, stripBrPrefixInput } from "../src/booking-search";

test("stripBrPrefixInput strips redundant BR- prefix when user pastes full BR-XXXXX into prefixed input", () => {
  assert.equal(stripBrPrefixInput("BR-48291"), "48291");
  assert.equal(stripBrPrefixInput("br-48291"), "48291");
  assert.equal(stripBrPrefixInput("#BR-48291"), "48291");
  assert.equal(stripBrPrefixInput("48291"), "48291");
  assert.equal(stripBrPrefixInput("Rustam Karimov"), "Rustam Karimov");
  assert.equal(stripBrPrefixInput("+998901234567"), "+998901234567");
});

test("formatBrSearchQuery prefixes 1-5 digit booking numbers with BR- while preserving guest names and phones", () => {
  assert.equal(formatBrSearchQuery(""), "");
  assert.equal(formatBrSearchQuery("48291"), "BR-48291");
  assert.equal(formatBrSearchQuery(" 482 "), "BR-482");
  assert.equal(formatBrSearchQuery("br-48291"), "BR-48291");
  assert.equal(formatBrSearchQuery("#BR-48291"), "BR-48291");
  assert.equal(formatBrSearchQuery("#48291"), "BR-48291");
  assert.equal(formatBrSearchQuery("+998901234567"), "+998901234567");
  assert.equal(formatBrSearchQuery("901234567"), "901234567");
  assert.equal(formatBrSearchQuery("feature mehmon"), "feature mehmon");
});
