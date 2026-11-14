import assert from "node:assert/strict";
import test from "node:test";
import {
  LOGIN_PATTERN,
  normalizeLoginInput,
  validateLoginFormat,
} from "../src/login-rules";

test("UI login format helpers normalize and validate Telegram-style rules", () => {
  assert.equal(normalizeLoginInput("  Yangi_Resepshn.01  "), "yangi_resepshn.01");
  assert.deepEqual(validateLoginFormat(""), {
    login: "",
    valid: false,
    message: null,
  });
  assert.deepEqual(validateLoginFormat("   "), {
    login: "",
    valid: false,
    message: null,
  });
  assert.equal(validateLoginFormat("ab").valid, false);
  assert.equal(validateLoginFormat("bad login").valid, false);
  assert.equal(validateLoginFormat("иван").valid, false);
  assert.equal(validateLoginFormat("a".repeat(65)).valid, false);
  assert.deepEqual(validateLoginFormat("  New.Director_9@uz  "), {
    login: "new.director_9@uz",
    valid: true,
    message: null,
  });
  assert.match("ali_01-uz", LOGIN_PATTERN);
});
