import assert from "node:assert/strict";
import test from "node:test";
import { MAX_AVATAR_BYTES, validateAvatarFile } from "../src/avatar";

const fakeFile = (name: string, type: string, size = 1024) =>
  ({ name, type, size }) as File;

test("validateAvatarFile accepts standard raster images and rejects unsafe/oversized files", () => {
  assert.equal(validateAvatarFile(fakeFile("photo.png", "image/png", 2048)), null);
  assert.equal(validateAvatarFile(fakeFile("avatar.jpg", "image/jpeg", 50000)), null);
  assert.equal(validateAvatarFile(fakeFile("photo.webp", "image/webp", 4096)), null);
  assert.match(
    validateAvatarFile(fakeFile("vector.svg", "image/svg+xml", 512)) ?? "",
    /SVG/,
  );
  assert.match(
    validateAvatarFile(fakeFile("doc.pdf", "application/pdf", 1024)) ?? "",
    /Faqat rasm/,
  );
  assert.match(
    validateAvatarFile(
      fakeFile("huge.png", "image/png", MAX_AVATAR_BYTES + 1),
    ) ?? "",
    /15 MB/,
  );
});
