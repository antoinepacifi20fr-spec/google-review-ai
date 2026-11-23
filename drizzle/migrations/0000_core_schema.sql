
CREATE TYPE public.member_role AS ENUM ('owner','editor','viewer');

CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  specialty text NOT NULL DEFAULT '' CHECK (char_length(specialty) <= 120),
  city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 120),
  tone text NOT NULL DEFAULT 'chaleureux' CHECK (tone IN ('chaleureux','professionnel','sobre','convivial')),
  language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','en','auto')),
  context text NOT NULL DEFAULT '' CHECK (char_length(context) <= 2000),
  brand_instructions text NOT NULL DEFAULT '' CHECK (char_length(brand_instructions) <= 2000),
  signature text NOT NULL DEFAULT '' CHECK (char_length(signature) <= 200),
  agent_enabled boolean NOT NULL DEFAULT false,
  review_threshold smallint NOT NULL DEFAULT 4 CHECK (review_threshold BETWEEN 1 AND 6),
  include_high_ratings boolean NOT NULL DEFAULT false,
  require_human_approval boolean NOT NULL DEFAULT true CHECK (require_human_approval = true),
  response_length text NOT NULL DEFAULT 'moyenne' CHECK (response_length IN ('courte','moyenne','longue')),
  personalization text NOT NULL DEFAULT 'elevee' CHECK (personalization IN ('faible','moyenne','elevee')),
  skip_empty_reviews boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_members (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, user_id)
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 120),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_date date NOT NULL,
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 5000),
  external_id text CHECK (external_id IS NULL OR char_length(external_id) BETWEEN 1 AND 200),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','csv','gbp_api')),
  existing_reply text CHECK (existing_reply IS NULL OR char_length(existing_reply) <= 5000),
  in_queue boolean NOT NULL DEFAULT false,
  reply_status text NOT NULL DEFAULT 'none' CHECK (reply_status IN ('none','draft','to_validate','approved','rejected','published_manual','published_api')),
  reply_text text CHECK (reply_text IS NULL OR char_length(reply_text) <= 5000),
  reply_generated_by_ai boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  published_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  dedupe_key text NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX reviews_external_uniq ON public.reviews(business_id, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX reviews_dedupe_uniq ON public.reviews(business_id, dedupe_key);
CREATE INDEX reviews_business_idx ON public.reviews(business_id, review_date DESC);

CREATE TABLE public.review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  review_id uuid REFERENCES public.reviews(id) ON DELETE SET NULL,
  user_id uuid DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('imported','updated','deleted','generated','generation_error','edited','approved','rejected','reopened','copied','published_manual','settings_updated','business_created')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_events_business_idx ON public.review_events(business_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT ON public.review_events TO authenticated;
GRANT ALL ON public.businesses, public.business_members, public.reviews, public.review_events TO service_role;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_business uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id = _business AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.can_edit(_business uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id = _business AND user_id = auth.uid() AND role IN ('owner','editor'))
$$;
CREATE OR REPLACE FUNCTION public.is_owner(_business uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id = _business AND user_id = auth.uid() AND role = 'owner')
$$;
REVOKE EXECUTE ON FUNCTION public.is_member(uuid), public.can_edit(uuid), public.is_owner(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_member(uuid), public.can_edit(uuid), public.is_owner(uuid) TO authenticated;

CREATE POLICY "members read business" ON public.businesses FOR SELECT TO authenticated USING (public.is_member(id) OR owner_id = auth.uid());
CREATE POLICY "users create own business" ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "editors update business" ON public.businesses FOR UPDATE TO authenticated USING (public.can_edit(id)) WITH CHECK (public.can_edit(id));
CREATE POLICY "owners delete business" ON public.businesses FOR DELETE TO authenticated USING (public.is_owner(id));

CREATE POLICY "members read members" ON public.business_members FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "owners add members" ON public.business_members FOR INSERT TO authenticated WITH CHECK (public.is_owner(business_id));
CREATE POLICY "owners update members" ON public.business_members FOR UPDATE TO authenticated USING (public.is_owner(business_id)) WITH CHECK (public.is_owner(business_id));
CREATE POLICY "owners delete members" ON public.business_members FOR DELETE TO authenticated USING (public.is_owner(business_id) AND user_id <> auth.uid());

CREATE POLICY "members read reviews" ON public.reviews FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "editors insert reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (public.can_edit(business_id));
CREATE POLICY "editors update reviews" ON public.reviews FOR UPDATE TO authenticated USING (public.can_edit(business_id)) WITH CHECK (public.can_edit(business_id));
CREATE POLICY "editors delete reviews" ON public.reviews FOR DELETE TO authenticated USING (public.can_edit(business_id));

CREATE POLICY "members read events" ON public.review_events FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "editors insert events" ON public.review_events FOR INSERT TO authenticated WITH CHECK (public.can_edit(business_id) AND user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.business_members(business_id, user_id, role) VALUES (NEW.id, NEW.owner_id, 'owner');
  INSERT INTO public.review_events(business_id, user_id, type, detail) VALUES (NEW.id, NEW.owner_id, 'business_created', jsonb_build_object('name', NEW.name));
  RETURN NEW;
END $$;
CREATE TRIGGER on_business_created AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.handle_new_business();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER businesses_touch BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.review_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.businesses%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.source = 'gbp_api' AND (TG_OP = 'INSERT' OR OLD.source IS DISTINCT FROM 'gbp_api') THEN
      RAISE EXCEPTION 'Source gbp_api réservée au fournisseur Google';
    END IF;
    IF NEW.reply_status = 'published_api' AND (TG_OP = 'INSERT' OR OLD.reply_status IS DISTINCT FROM 'published_api') THEN
      RAISE EXCEPTION 'Le statut « Publiée via API » est réservé à une confirmation réelle de Google';
    END IF;
  END IF;
  NEW.dedupe_key := md5(lower(btrim(NEW.author_name)) || '|' || NEW.rating::text || '|' || to_char(NEW.review_date, 'YYYY-MM-DD') || '|' || lower(btrim(NEW.comment)));
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO b FROM public.businesses WHERE id = NEW.business_id;
    IF NEW.existing_reply IS NOT NULL AND btrim(NEW.existing_reply) <> '' THEN
      NEW.in_queue := false;
      IF NEW.reply_status = 'none' THEN
        NEW.reply_status := 'published_manual';
        NEW.reply_text := NEW.existing_reply;
        NEW.published_at := now();
      END IF;
    ELSE
      NEW.in_queue := (NEW.rating < b.review_threshold) OR b.include_high_ratings;
    END IF;
  END IF;
  IF NEW.reply_status = 'approved' AND (TG_OP = 'INSERT' OR OLD.reply_status IS DISTINCT FROM 'approved') THEN NEW.approved_at := now(); END IF;
  IF TG_OP = 'UPDATE' AND NEW.reply_status IN ('published_manual','published_api') AND OLD.reply_status IS DISTINCT FROM NEW.reply_status THEN NEW.published_at := now(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER reviews_rules BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.review_rules();
