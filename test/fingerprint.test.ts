import { describe, expect, it } from "vitest";
import { createAuthFingerprint, stableStringify } from "../src/utils/fingerprint";

describe("fingerprint", () => {
  it("serializes object keys deterministically", () => {
    const left = { b: 2, a: { d: 4, c: 3 } };
    const right = { a: { c: 3, d: 4 }, b: 2 };

    expect(stableStringify(left)).toBe(stableStringify(right));
  });

  it("creates the same fingerprint for equivalent auth JSON", () => {
    const first = {
      tokens: { refresh_token: "fake-refresh-token", access_token: "fake-access-token" }
    };
    const second = {
      tokens: { access_token: "fake-access-token", refresh_token: "fake-refresh-token" }
    };

    expect(createAuthFingerprint(first)).toBe(createAuthFingerprint(second));
  });
});
