import { createFileRoute } from "@tanstack/react-router";
import { ReviewWorkspace } from "@/components/review-workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Google Review AI — Gestion des avis" },
      {
        name: "description",
        content: "Gérez vos avis clients et préparez des réponses avec validation humaine.",
      },
    ],
  }),
  component: ReviewWorkspace,
});
