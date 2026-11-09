import { describe, expect, it } from "vitest";
import { claimsToGoogle, googleAccountDecision } from "@/lib/firebase-token";

describe("Google account landing", () => {
  it("sends one shop in, many shops to a choice, and nobody to setup", () => {
    expect(googleAccountDecision(1)).toBe("shop");
    expect(googleAccountDecision(2)).toBe("choose");
    expect(googleAccountDecision(0)).toBe("setup");
  });

  it("trusts only a verified Google token for the email", () => {
    expect(
      claimsToGoogle({
        sub: "uid-1",
        email: "Owner@Example.com",
        email_verified: true,
        name: "Meera Gupta",
        firebase: { sign_in_provider: "google.com" },
      }),
    ).toEqual({ email: "owner@example.com", name: "Meera Gupta", uid: "uid-1" });
  });

  it("rejects a token that is not Google", () => {
    expect(() =>
      claimsToGoogle({
        sub: "uid-1",
        email: "owner@example.com",
        email_verified: true,
        firebase: { sign_in_provider: "password" },
      }),
    ).toThrow(/Google/);
  });
});
