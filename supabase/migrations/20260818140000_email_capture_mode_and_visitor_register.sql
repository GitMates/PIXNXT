-- Email registration: which fields to ask, store name/phone, and a public RPC
-- so visitors can register once before the gallery opens.

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS email_capture_mode text NOT NULL DEFAULT 'email';

ALTER TABLE public.deliveries
  DROP CONSTRAINT IF EXISTS deliveries_email_capture_mode_check;

ALTER TABLE public.deliveries
  ADD CONSTRAINT deliveries_email_capture_mode_check
  CHECK (email_capture_mode IN ('email', 'email_name', 'email_name_phone'));

COMMENT ON COLUMN public.deliveries.email_capture_mode IS
  'Fields asked on the one-time gallery registration screen: email, email_name, or email_name_phone.';

ALTER TABLE public.client_sessions
  ADD COLUMN IF NOT EXISTS visitor_name text,
  ADD COLUMN IF NOT EXISTS visitor_phone text;

COMMENT ON COLUMN public.client_sessions.visitor_name IS 'Name collected when email registration asks for it.';
COMMENT ON COLUMN public.client_sessions.visitor_phone IS 'Phone collected when email registration asks for it.';

-- Compatibility view froze its column list when it was created.
DROP VIEW IF EXISTS public.collections CASCADE;

CREATE VIEW public.collections AS
SELECT * FROM public.deliveries;

COMMENT ON VIEW public.collections IS
  'Compatibility alias for public.deliveries after the collections → deliveries rename.';

GRANT SELECT ON public.collections TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.register_gallery_visitor(
  p_collection_id uuid,
  p_email text,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.deliveries%ROWTYPE;
  v_email text;
  v_name text;
  v_phone text;
  v_session_id uuid;
  v_contact_id uuid;
  v_existing boolean := false;
BEGIN
  v_email := lower(trim(p_email));
  v_name := nullif(trim(coalesce(p_name, '')), '');
  v_phone := nullif(trim(coalesce(p_phone, '')), '');

  IF v_email IS NULL OR v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;

  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE id = p_collection_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  IF coalesce(v_delivery.email_capture_enabled, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Email registration is not enabled for this delivery';
  END IF;

  SELECT id INTO v_session_id
  FROM public.client_sessions
  WHERE collection_id = p_collection_id
    AND lower(visitor_email) = v_email
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    v_existing := true;
    UPDATE public.client_sessions
    SET
      visitor_name = coalesce(v_name, visitor_name),
      visitor_phone = coalesce(v_phone, visitor_phone)
    WHERE id = v_session_id;
  ELSE
    INSERT INTO public.client_sessions (
      collection_id,
      visitor_email,
      visitor_name,
      visitor_phone,
      access_level,
      created_at
    )
    VALUES (
      p_collection_id,
      v_email,
      v_name,
      v_phone,
      'guest',
      now()
    )
    RETURNING id INTO v_session_id;
  END IF;

  IF v_delivery.photographer_id IS NOT NULL THEN
    BEGIN
      SELECT id INTO v_contact_id
      FROM public.contacts
      WHERE photographer_id = v_delivery.photographer_id
        AND lower(email) = v_email
      LIMIT 1;

      IF v_contact_id IS NOT NULL THEN
        UPDATE public.contacts
        SET
          full_name = coalesce(v_name, full_name),
          phone = coalesce(v_phone, phone),
          updated_at = now()
        WHERE id = v_contact_id;
      ELSE
        INSERT INTO public.contacts (
          photographer_id,
          email,
          full_name,
          phone
        )
        VALUES (
          v_delivery.photographer_id,
          v_email,
          v_name,
          v_phone
        )
        RETURNING id INTO v_contact_id;
      END IF;

      IF v_contact_id IS NOT NULL THEN
        INSERT INTO public.delivery_contacts (collection_id, contact_id)
        SELECT p_collection_id, v_contact_id
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.delivery_contacts dc
          WHERE dc.collection_id = p_collection_id
            AND dc.contact_id = v_contact_id
        );

        UPDATE public.client_sessions
        SET contact_id = coalesce(contact_id, v_contact_id)
        WHERE id = v_session_id;
      END IF;

      IF NOT v_existing THEN
        INSERT INTO public.activity_log (
          collection_id,
          photographer_id,
          event_type,
          visitor_email,
          metadata
        )
        VALUES (
          p_collection_id,
          v_delivery.photographer_id,
          'email_register',
          v_email,
          jsonb_build_object(
            'source', 'Gallery Registration',
            'type', 'email',
            'name', v_name,
            'phone', v_phone
          )
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'email', v_email,
    'name', v_name,
    'phone', v_phone,
    'existing', v_existing
  );
END;
$$;

ALTER FUNCTION public.register_gallery_visitor(uuid, text, text, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.register_gallery_visitor(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_gallery_visitor(uuid, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.register_gallery_visitor(uuid, text, text, text) IS
  'Public gallery registration: stores email/name/phone once, creates a client session, and adds a studio contact.';
