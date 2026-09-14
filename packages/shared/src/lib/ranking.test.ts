import { describe, expect, it } from "vitest";
import {
  BADGE_SLUG_WEIGHT,
  BOOST_TIER_SCALE,
  computeRankingScore,
  parseSearchBoostValue,
  VERIFICATION_SCALE,
  VERIFICATION_STATUS_WEIGHT,
} from "./ranking.js";

describe("parseSearchBoostValue", () => {
  it("mapeia os tiers definidos nos planos", () => {
    expect(parseSearchBoostValue("1")).toBe(1); // Trust
    expect(parseSearchBoostValue("2")).toBe(2); // Premium
    expect(parseSearchBoostValue("3")).toBe(3); // Enterprise
  });

  it("valores sem boost ou inválidos devolvem 0 (Free)", () => {
    expect(parseSearchBoostValue(null)).toBe(0);
    expect(parseSearchBoostValue(undefined)).toBe(0);
    expect(parseSearchBoostValue("0")).toBe(0);
    expect(parseSearchBoostValue("abc")).toBe(0);
    expect(parseSearchBoostValue("42")).toBe(0);
  });
});

describe("computeRankingScore", () => {
  function score(partial: Parameters<typeof computeRankingScore>[0]) {
    return computeRankingScore({ verificationStatus: null, activeBadgeSlugs: [], ...partial });
  }

  it("tiers de plano dominam qualquer combinação de sinais de qualidade de um tier inferior", () => {
    const freeBest = computeRankingScore({
      searchBoostTier: 0,
      verificationStatus: "verified",
      activeBadgeSlugs: ["verified", "highly-rated", "profile-complete"],
    });
    const trustWorst = score({ searchBoostTier: 1, verificationStatus: null });
    expect(freeBest).toBeLessThan(trustWorst);
  });

  it("cada tier seguinte ganha exactamente BOOST_TIER_SCALE", () => {
    expect(score({ searchBoostTier: 1 }) - score({ searchBoostTier: 0 })).toBe(BOOST_TIER_SCALE);
    expect(score({ searchBoostTier: 2 }) - score({ searchBoostTier: 1 })).toBe(BOOST_TIER_SCALE);
    expect(score({ searchBoostTier: 3 }) - score({ searchBoostTier: 2 })).toBe(BOOST_TIER_SCALE);
  });

  it("verificação sobe dentro do mesmo tier", () => {
    const base = score({ searchBoostTier: 1, verificationStatus: null });
    const verified = score({ searchBoostTier: 1, verificationStatus: "verified" });
    const inReview = score({ searchBoostTier: 1, verificationStatus: "in_review" });
    const pending = score({ searchBoostTier: 1, verificationStatus: "pending" });
    expect(inReview).toBeGreaterThan(pending);
    expect(verified).toBeGreaterThan(inReview);
    expect(verified - base).toBe(VERIFICATION_STATUS_WEIGHT["verified"] * VERIFICATION_SCALE);
  });

  it("selos somam e nunca ultrapassam a barreira do tier", () => {
    const noBadges = score({ searchBoostTier: 3, verificationStatus: null });
    const allBadges = score({
      searchBoostTier: 3,
      verificationStatus: "verified",
      activeBadgeSlugs: Object.keys(BADGE_SLUG_WEIGHT),
    });
    expect(allBadges).toBeGreaterThan(noBadges);
    // max sinais dentro de um tier < BOOST_TIER_SCALE
    expect(allBadges - noBadges).toBeLessThan(BOOST_TIER_SCALE);
  });

  it("badges desconhecidos/nulos não somam", () => {
    const none = score({ searchBoostTier: 1 });
    const withUnknown = score({ searchBoostTier: 1, activeBadgeSlugs: [null, "nao-existe", "verified"] });
    expect(withUnknown - none).toBe(BADGE_SLUG_WEIGHT["verified"]);
  });
});