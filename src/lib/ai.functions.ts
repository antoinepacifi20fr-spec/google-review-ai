import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  reviewId: z.string().uuid(),
  hint: z.string().max(500).optional(),
});

const TONE: Record<string, string> = {
  chaleureux: "chaleureux et humain, sans familiarité excessive",
  professionnel: "professionnel, précis et courtois",
  sobre: "sobre, factuel et élégant",
  convivial: "convivial et spontané, tout en restant respectueux",
};
const LENGTH: Record<string, string> = {
  courte: "2 à 3 phrases (environ 40 à 60 mots)",
  moyenne: "3 à 5 phrases (environ 60 à 110 mots)",
  longue: "5 à 7 phrases (environ 110 à 170 mots)",
};
const PERSO: Record<string, string> = {
  faible: "Reste général, ne reprends qu'un élément de l'avis.",
  moyenne: "Reprends un ou deux éléments concrets de l'avis.",
  elevee: "Reprends précisément les éléments concrets mentionnés par le client, avec des formulations propres à cet avis.",
};

function extractText(res: unknown): string {
  const r = res as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  const parts: string[] = [];
  for (const item of r.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) if (c.type === "output_text" && c.text) parts.push(c.text);
  }
  return parts.join("").trim();
}

export const generateReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: review, error: rErr } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", data.reviewId)
      .maybeSingle();
    if (rErr || !review) throw new Error("Avis introuvable ou accès refusé.");

    const { data: canEdit } = await supabase.rpc("can_edit", { _business: review.business_id });
    if (!canEdit) throw new Error("Vous n'avez pas les droits de modification sur cet établissement.");

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", review.business_id)
      .single();
    if (!biz) throw new Error("Établissement introuvable.");

    const lang =
      biz.language === "en" ? "anglais" : biz.language === "auto" ? "la langue de l'avis" : "français";

    const instructions = [
      `Tu rédiges, pour le compte de l'établissement « ${biz.name} »${biz.specialty ? ` (${biz.specialty})` : ""}${biz.city ? ` à ${biz.city}` : ""}, une réponse publique à un avis Google.`,
      `Langue : ${lang}. Ton : ${TONE[biz.tone] ?? TONE["chaleureux"]}. Longueur : ${LENGTH[biz.response_length] ?? LENGTH["moyenne"]}.`,
      PERSO[biz.personalization] ?? PERSO["elevee"],
      "Règles impératives :",
      "- N'invente aucun fait, prestation, date, promotion, geste commercial, remboursement ou engagement qui ne figure pas dans le contexte fourni.",
      "- Ne divulgue aucune information personnelle (santé, contenu de séance, coordonnées du client, détails de dossier). Ne confirme pas qu'une personne est cliente au-delà de ce qu'elle écrit elle-même.",
      "- Avis négatif ou mitigé : remercie, reconnais le ressenti avec empathie sans te justifier longuement ni contredire, et propose un échange privé (sans inventer de numéro ni d'adresse : utilise uniquement les coordonnées présentes dans le contexte, sinon écris « n'hésitez pas à nous contacter directement »).",
      "- Avis positif : remercie avec sincérité en reprenant ce que le client a apprécié, sans superlatifs creux.",
      "- Évite les formules toutes faites (« Nous avons bien pris note », « Votre satisfaction est notre priorité »). Varie l'ouverture.",
      "- Utilise le prénom de l'auteur seulement s'il apparaît clairement comme un prénom ; jamais le nom de famille.",
      "- Pas d'emoji, pas de hashtag, pas de guillemets autour de la réponse, pas d'objet ni de titre.",
      biz.signature ? `- Termine par cette signature exacte sur une nouvelle ligne : ${biz.signature}` : "- Pas de signature.",
      "Retourne uniquement le texte de la réponse.",
    ].join("\n");

    const userPrompt = [
      biz.context ? `Contexte de l'établissement (source fiable) :\n${biz.context}` : "Contexte de l'établissement : non renseigné.",
      biz.brand_instructions ? `Consignes de marque :\n${biz.brand_instructions}` : "",
      `Avis à traiter :\n- Auteur : ${review.author_name}\n- Note : ${review.rating}/5\n- Date : ${review.review_date}\n- Texte : ${review.comment ? review.comment : "(aucun texte, note seule)"}`,
      data.hint ? `Indication de l'utilisateur pour cette version : ${data.hint}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const { generateResponse } = await import("@lovable.dev/ai-gateway");
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions,
        input: userPrompt,
      });
      const text = extractText(res);
      if (!text) throw new Error("Le service d'IA n'a renvoyé aucun texte.");

      const { error: uErr } = await supabase
        .from("reviews")
        .update({ reply_text: text, reply_status: "to_validate", reply_generated_by_ai: true })
        .eq("id", review.id);
      if (uErr) throw new Error(uErr.message);
      await supabase.from("review_events").insert({
        business_id: review.business_id,
        review_id: review.id,
        user_id: userId,
        type: "generated",
        detail: { model: "openai/gpt-6-astra", regenerated: Boolean(review.reply_text) },
      });
      return { text };
    } catch (e) {
      const err = e as { name?: string; code?: string; message?: string; httpStatus?: number };
      let message = "La génération a échoué. Vous pouvez réessayer ou rédiger la réponse manuellement.";
      if (err.code === "payment_required" || err.httpStatus === 402)
        message = "Crédits IA épuisés sur l'espace de travail. Rédigez la réponse manuellement ou rechargez les crédits.";
      else if (err.code === "rate_limited" || err.httpStatus === 429)
        message = "Trop de demandes au service d'IA. Patientez une minute avant de réessayer.";
      else if (err.code === "configuration_error" || err.code === "authentication_error")
        message = "Service d'IA non configuré pour cette application (configuration requise).";
      console.error("generateReply failed", err.code, err.httpStatus, err.message);
      await supabase.from("review_events").insert({
        business_id: review.business_id,
        review_id: review.id,
        user_id: userId,
        type: "generation_error",
        detail: { code: err.code ?? err.name ?? "unknown", status: err.httpStatus ?? null },
      });
      throw new Error(message);
    }
  });
