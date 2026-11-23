import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  FileText,
  Link2,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
} from "lucide-react";

type Section = "overview" | "reviews" | "queue" | "history" | "settings" | "integrations";

const navigation: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Vue d’ensemble", icon: Activity },
  { id: "reviews", label: "Avis", icon: MessageSquareText },
  { id: "queue", label: "À traiter", icon: ClipboardList },
  { id: "history", label: "Historique", icon: Clock3 },
];

const sectionTitles: Record<Section, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "Espace de travail",
    title: "Vue d’ensemble",
    description: "Un aperçu fiable de vos avis et de votre activité.",
  },
  reviews: {
    eyebrow: "Retours clients",
    title: "Avis",
    description: "Importez et gérez les avis de votre établissement.",
  },
  queue: {
    eyebrow: "Réponses",
    title: "À traiter",
    description: "Les avis sous le seuil défini attendent une réponse humaine.",
  },
  history: {
    eyebrow: "Journal d’activité",
    title: "Historique",
    description: "Les actions effectuées sur les avis seront consignées ici.",
  },
  settings: {
    eyebrow: "Espace de travail",
    title: "Paramètres",
    description: "Configurez votre établissement et le comportement de l’agent.",
  },
  integrations: {
    eyebrow: "Connexions",
    title: "Intégrations",
    description: "État des services nécessaires à votre espace.",
  },
};

function RequiredState({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof LockKeyhole;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex max-w-xl flex-col items-center text-center">
      <div className="mb-5 flex size-12 items-center justify-center rounded-full border border-border bg-background text-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

function SetupChecklist({ onOpen }: { onOpen: (section: Section) => void }) {
  const items = [
    {
      number: "01",
      title: "Connecter Supabase",
      detail: "Authentification, base de données et politiques RLS.",
      icon: LockKeyhole,
      section: "integrations" as Section,
    },
    {
      number: "02",
      title: "Configurer Gemini",
      detail: "Génération sécurisée côté serveur, jamais dans le navigateur.",
      icon: Sparkles,
      section: "integrations" as Section,
    },
    {
      number: "03",
      title: "Créer votre établissement",
      detail: "Nom, spécialité, ton de réponse et seuil de traitement.",
      icon: Store,
      section: "settings" as Section,
    },
  ];
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map(({ number, title, detail, icon: Icon, section }) => (
        <button
          key={number}
          onClick={() => onOpen(section)}
          className="group flex w-full items-center gap-4 py-5 text-left transition-colors hover:bg-subtle/60"
        >
          <span className="font-mono text-xs text-muted-foreground">{number}</span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{title}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </button>
      ))}
    </div>
  );
}

function IntegrationStatus({
  title,
  subtitle,
  status,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  status: string;
  icon: typeof LockKeyhole;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-border py-5 last:border-0">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border">
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {status}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronDown aria-hidden="true" className="size-4 rotate-[-90deg] text-muted-foreground" />
    </div>
  );
}

function SectionContent({
  section,
  onOpen,
}: {
  section: Section;
  onOpen: (section: Section) => void;
}) {
  if (section === "integrations") {
    return (
      <div className="max-w-3xl">
        <div className="mb-6 rounded-lg border border-border bg-subtle/50 p-4">
          <div className="flex gap-3">
            <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-sm font-medium">Aucune base de données n’est connectée</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Vous avez choisi de ne pas connecter Supabase ni d’ajouter de variables
                d’environnement. Gemini passe par la passerelle IA du projet, mais les parcours
                nécessitant un compte et des données persistantes restent désactivés.
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-card px-5">
          <IntegrationStatus
            title="Supabase"
            subtitle="Requis pour la connexion utilisateur, la sauvegarde durable des avis et les journaux d’activité. Aucune base n’est connectée à cette application."
            status="Non configuré"
            icon={LockKeyhole}
          />
          <IntegrationStatus
            title="Gemini"
            subtitle="Le backend utilise Gemini via Vercel AI Gateway côté serveur. La génération reste bloquée jusqu’à la connexion Supabase et une session utilisateur."
            status="En attente de Supabase"
            icon={Sparkles}
          />
          <IntegrationStatus
            title="Google Business Profile"
            subtitle="L’autorisation API n’a pas été accordée. Aucune connexion ni publication Google ne sera simulée."
            status="Non autorisé"
            icon={Link2}
          />
        </div>
        <div className="mt-8 rounded-lg border border-dashed border-border p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div>
              <h3 className="text-sm font-medium">Conçu pour une activation sécurisée</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Les accès doivent être configurés dans l’environnement du projet, jamais collés dans
                l’interface ou dans le code client. Aucun schéma n’a été appliqué et aucune base
                Lovable n’a été déclarée migrée.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === "settings") {
    return (
      <div className="max-w-3xl">
        <div className="mb-8 rounded-lg border border-border bg-subtle/50 p-4">
          <div className="flex gap-3">
            <Store aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-sm font-medium">Aucun établissement configuré</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Les préférences seront enregistrées dans Supabase après connexion. Il n’est pas
                possible de les rendre persistantes sans base configurée.
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-card px-5">
          <IntegrationStatus
            title="Profil de l’établissement"
            subtitle="Nom, spécialité, ville et langue de réponse."
            status="À configurer"
            icon={Store}
          />
          <IntegrationStatus
            title="Ton et consignes"
            subtitle="Voix de marque, signature et contexte fiable pour les réponses."
            status="À configurer"
            icon={Settings2}
          />
          <IntegrationStatus
            title="Règle de traitement"
            subtitle="Par défaut, les avis strictement sous 4 étoiles sont à traiter. Cette règle sera configurable."
            status="Par défaut : < 4"
            icon={ClipboardList}
          />
          <IntegrationStatus
            title="Validation humaine"
            subtitle="Toute réponse générée doit être approuvée avant toute publication manuelle."
            status="Toujours requise"
            icon={ShieldCheck}
          />
        </div>
      </div>
    );
  }

  if (section === "reviews") {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-14">
        <RequiredState
          icon={FileText}
          title="Aucun avis importé"
          detail="L’import manuel et CSV sera disponible une fois Supabase connecté. Les fichiers ne sont pas importés dans le navigateur pour éviter de laisser croire qu’ils sont sauvegardés."
        />
        <button
          disabled
          className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground opacity-45"
          title="Connectez Supabase pour activer l’import"
        >
          <Plus aria-hidden="true" className="size-4" />
          Importer des avis
        </button>
      </div>
    );
  }

  if (section === "queue") {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-14">
        <RequiredState
          icon={ClipboardList}
          title="La file d’attente est vide"
          detail="Les avis sous le seuil configuré apparaîtront ici après l’import d’avis réels. Aucune réponse ne sera générée ou publiée automatiquement."
        />
      </div>
    );
  }

  if (section === "history") {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-14">
        <RequiredState
          icon={Clock3}
          title="Aucune activité enregistrée"
          detail="Les imports, modifications, générations, validations et rejets seront consignés dans un historique durable une fois la base connectée."
        />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Avis importés", value: "—", icon: MessageSquareText },
          { label: "À traiter", value: "—", icon: ClipboardList },
          { label: "Réponses approuvées", value: "—", icon: Check },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs">{label}</span>
              <Icon aria-hidden="true" className="size-4" />
            </div>
            <div className="mt-5 text-2xl font-semibold tabular-nums">{value}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">Aucune donnée connectée</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
        <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Démarrer votre espace</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Les données réelles nécessitent une configuration externe.
              </p>
            </div>
            <ArrowDownToLine aria-hidden="true" className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-5">
            <SetupChecklist onOpen={onOpen} />
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Star aria-hidden="true" className="size-4" />
            <h2 className="text-sm font-semibold">Traitement des avis</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Par défaut, les avis strictement inférieurs à 4 étoiles sont ajoutés à la file. Chaque
            brouillon nécessite une validation humaine avant publication.
          </p>
          <div className="mt-5 border-t border-border pt-4">
            <button
              onClick={() => onOpen("settings")}
              className="inline-flex items-center gap-2 text-xs font-medium transition-colors hover:text-muted-foreground"
            >
              Paramètres de traitement
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        </section>
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border px-4 py-3">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p className="text-xs leading-5 text-muted-foreground">
          Aucune statistique, réponse, connexion Google ou import n’est simulé. Les tirets indiquent
          que les données ne sont pas disponibles.
        </p>
      </div>
    </>
  );
}

export function ReviewWorkspace() {
  const [section, setSection] = useState<Section>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const page = sectionTitles[section];

  function navigate(next: Section) {
    setSection(next);
    setMobileMenuOpen(false);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-[72px] items-center gap-3 border-b border-border px-6">
          <div className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
            <MessageSquareText aria-hidden="true" className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">
              review<span className="font-normal">desk</span>
            </p>
            <p className="mt-0.5 text-[10px] tracking-wide text-muted-foreground">
              GOOGLE REVIEW AI
            </p>
          </div>
        </div>
        <div className="px-4 pt-6">
          <p className="eyebrow px-2">Espace de travail</p>
          <button
            onClick={() => navigate("settings")}
            className="mt-3 flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-subtle"
          >
            <div className="flex size-7 items-center justify-center rounded border border-border bg-background">
              <Store aria-hidden="true" className="size-3.5" />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">Mon établissement</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">À configurer</span>
            </span>
            <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
          </button>
        </div>
        <nav aria-label="Navigation principale" className="flex-1 px-4 pt-7">
          <p className="eyebrow mb-2 px-2">Gestion</p>
          <div className="flex flex-col gap-1">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                aria-current={section === id ? "page" : undefined}
                className={`flex h-9 items-center gap-3 rounded-md px-2.5 text-left text-xs transition-colors ${section === id ? "bg-subtle font-medium text-foreground" : "text-muted-foreground hover:bg-subtle hover:text-foreground"}`}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
                {id === "queue" && <span className="ml-auto text-[10px] tabular-nums">—</span>}
              </button>
            ))}
          </div>
        </nav>
        <div className="flex flex-col gap-1 border-t border-border px-4 py-4">
          <button
            onClick={() => navigate("settings")}
            aria-current={section === "settings" ? "page" : undefined}
            className={`flex h-9 items-center gap-3 rounded-md px-2.5 text-left text-xs transition-colors ${section === "settings" ? "bg-subtle font-medium" : "text-muted-foreground hover:bg-subtle hover:text-foreground"}`}
          >
            <Settings2 aria-hidden="true" className="size-4" />
            Paramètres
          </button>
          <button
            onClick={() => navigate("integrations")}
            aria-current={section === "integrations" ? "page" : undefined}
            className={`flex h-9 items-center gap-3 rounded-md px-2.5 text-left text-xs transition-colors ${section === "integrations" ? "bg-subtle font-medium" : "text-muted-foreground hover:bg-subtle hover:text-foreground"}`}
          >
            <Link2 aria-hidden="true" className="size-4" />
            Intégrations
            <span className="ml-auto size-1.5 rounded-full bg-foreground" />
          </button>
          <div className="mt-3 flex items-center gap-3 border-t border-border pt-4">
            <div className="flex size-8 items-center justify-center rounded-full border border-border text-xs font-medium">
              ?
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium">Non connecté</p>
              <p className="text-[10px] text-muted-foreground">Compte indisponible</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-border bg-background px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              className="rounded p-1 lg:hidden"
              aria-label="Ouvrir la navigation"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="block size-4">
                <span className="block h-px w-4 bg-foreground" />
                <span className="mt-1.5 block h-px w-4 bg-foreground" />
                <span className="mt-1.5 block h-px w-4 bg-foreground" />
              </span>
            </button>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Mon établissement
            </span>
            <span className="hidden text-xs text-border-strong sm:inline">/</span>
            <span className="text-xs font-medium">{page.title}</span>
          </div>
          <button
            onClick={() => navigate("integrations")}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium transition-colors hover:bg-subtle"
          >
            <span className="size-1.5 rounded-full border border-foreground" />
            Configuration requise
          </button>
        </header>
        {mobileMenuOpen && (
          <nav
            aria-label="Navigation mobile"
            className="border-b border-border bg-background px-5 py-3 lg:hidden"
          >
            <div className="flex flex-col gap-1">
              {[
                ...navigation,
                { id: "settings" as Section, label: "Paramètres", icon: Settings2 },
                { id: "integrations" as Section, label: "Intégrations", icon: Link2 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => navigate(id)}
                  className={`flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm ${section === id ? "bg-subtle font-medium" : "text-muted-foreground hover:bg-subtle"}`}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </nav>
        )}
        <div className="mx-auto max-w-[1240px] px-5 pb-16 pt-9 sm:px-8 sm:pt-11 lg:px-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{page.eyebrow}</p>
              <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] sm:text-[32px]">
                {page.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{page.description}</p>
            </div>
            {section === "overview" && (
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-foreground" />
                Configuration incomplète
              </span>
            )}
          </div>
          <SectionContent section={section} onOpen={navigate} />
          <footer className="mt-12 flex flex-col gap-2 border-t border-border pt-5 text-[10px] leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Google Review AI <span className="px-1.5">·</span> Espace de travail non connecté
            </span>
            <span>Les réponses nécessitent toujours une approbation humaine.</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
