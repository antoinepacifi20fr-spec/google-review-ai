import { describe, expect, it } from "vitest";
import { computeStats, shouldQueue, validateRows, normalizeDate } from "@/lib/reviews";
import { googleBusinessProfileProvider } from "@/lib/gbp/provider";

describe("règle À traiter", () => {
  it("met en file les avis strictement sous 4 étoiles par défaut", () => {
    expect(shouldQueue(3, 4, false, false)).toBe(true);
    expect(shouldQueue(4, 4, false, false)).toBe(false);
    expect(shouldQueue(5, 4, false, false)).toBe(false);
  });
  it("inclut 4 et 5 étoiles si l'option est activée", () => {
    expect(shouldQueue(5, 4, true, false)).toBe(true);
  });
  it("n'inclut pas un avis qui a déjà une réponse", () => {
    expect(shouldQueue(1, 4, false, true)).toBe(false);
  });
});

describe("statistiques", () => {
  it("calcule moyenne, réponses et file depuis les avis importés", () => {
    const s = computeStats([
      { rating: 5, reply_status: "published_manual", in_queue: false },
      { rating: 2, reply_status: "to_validate", in_queue: true },
      { rating: 3, reply_status: "approved", in_queue: true },
    ]);
    expect(s.total).toBe(3);
    expect(s.average).toBeCloseTo(10 / 3);
    expect(s.answeredPct).toBe(33);
    expect(s.pending).toBe(1);
  });
  it("renvoie null sans avis", () => {
    expect(computeStats([]).average).toBeNull();
  });
});

describe("import CSV", () => {
  const map = { author_name: "a", rating: "n", review_date: "d", comment: "c" } as const;
  it("rejette note hors 1..5 et doublons", () => {
    const r = validateRows(
      [
        { a: "Marie", n: "6", d: "2026-01-02", c: "x" },
        { a: "Paul", n: "4", d: "02/01/2026", c: "Bien" },
        { a: "Paul", n: "4", d: "2026-01-02", c: "Bien" },
      ],
      map,
    );
    expect(r[0]!.ok).toBe(false);
    expect(r[1]!.ok).toBe(true);
    expect(r[2]!.errors).toContain("Doublon dans le fichier");
  });
  it("normalise JJ/MM/AAAA", () => {
    expect(normalizeDate("5/3/2026")).toBe("2026-03-05");
  });
});

describe("fournisseur Google", () => {
  it("reste en attente d'autorisation et refuse de publier", async () => {
    expect(googleBusinessProfileProvider.status().state).toBe("pending_authorization");
    await expect(googleBusinessProfileProvider.publishReply("x", "y")).rejects.toThrow();
  });
});
