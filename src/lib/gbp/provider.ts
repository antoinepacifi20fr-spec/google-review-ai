/**
 * Couche fournisseur d'avis. Le fournisseur « manual » est actif ; le fournisseur
 * Google Business Profile est prêt côté interface mais NE FAIT AUCUN APPEL tant que
 * l'accès API n'est pas accordé par Google et que la connexion OAuth n'est pas configurée.
 */
export type ProviderStatus =
  | { state: "active" }
  | { state: "pending_authorization"; reason: string }
  | { state: "error"; reason: string };

export interface ProviderReview {
  externalId: string;
  authorName: string;
  rating: number;
  date: string;
  comment: string;
  existingReply: string | null;
}

export interface ReviewProvider {
  id: "manual" | "google_business_profile";
  label: string;
  status(): ProviderStatus;
  canList: boolean;
  canPublish: boolean;
  listReviews(locationName: string): Promise<ProviderReview[]>;
  publishReply(reviewName: string, text: string): Promise<{ ok: true; publishedAt: string }>;
}

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

export const GBP_PENDING_REASON =
  "L'accès à l'API Google Business Profile n'a pas été accordé à ce projet Google Cloud. La lecture et la publication automatiques des avis sont désactivées.";

export const manualProvider: ReviewProvider = {
  id: "manual",
  label: "Import manuel",
  status: () => ({ state: "active" }),
  canList: false,
  canPublish: false,
  listReviews: async () => {
    throw new ProviderUnavailableError("L'import manuel ne lit pas d'avis à distance.");
  },
  publishReply: async () => {
    throw new ProviderUnavailableError(
      "La publication se fait manuellement dans Google Business Profile.",
    );
  },
};

/**
 * Points d'entrée prévus une fois l'accès accordé (via la passerelle connecteur, côté serveur) :
 *  - GET  my_business/v4/accounts/{a}/locations/{l}/reviews
 *  - PUT  my_business/v4/accounts/{a}/locations/{l}/reviews/{r}/reply
 * Le statut « Publiée via API » ne sera écrit qu'avec le client serveur après succès réel.
 */
export const googleBusinessProfileProvider: ReviewProvider = {
  id: "google_business_profile",
  label: "Google Business Profile",
  status: () => ({ state: "pending_authorization", reason: GBP_PENDING_REASON }),
  canList: false,
  canPublish: false,
  listReviews: async () => {
    throw new ProviderUnavailableError(GBP_PENDING_REASON);
  },
  publishReply: async () => {
    throw new ProviderUnavailableError(GBP_PENDING_REASON);
  },
};

export const providers = [manualProvider, googleBusinessProfileProvider];
