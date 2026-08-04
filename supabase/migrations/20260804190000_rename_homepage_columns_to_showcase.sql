-- Rename Homepage product columns → Showcase (keeps data; app must use new names).
-- Safe to re-run: renames only when old name exists and new name does not.

-- photographers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photographers' AND column_name = 'homepage_enabled'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photographers' AND column_name = 'showcase_enabled'
  ) THEN
    ALTER TABLE public.photographers RENAME COLUMN homepage_enabled TO showcase_enabled;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photographers' AND column_name = 'homepage_password'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photographers' AND column_name = 'showcase_password'
  ) THEN
    ALTER TABLE public.photographers RENAME COLUMN homepage_password TO showcase_password;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photographers' AND column_name = 'homepage_slug'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photographers' AND column_name = 'showcase_slug'
  ) THEN
    ALTER TABLE public.photographers RENAME COLUMN homepage_slug TO showcase_slug;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photographers' AND column_name = 'homepage_sort'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'photographers' AND column_name = 'showcase_sort'
  ) THEN
    ALTER TABLE public.photographers RENAME COLUMN homepage_sort TO showcase_sort;
  END IF;
END $$;

-- deliveries.show_on_homepage → show_on_showcase
DO $$
BEGIN
  IF to_regclass('public.deliveries') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deliveries' AND column_name = 'show_on_homepage'
     )
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'deliveries' AND column_name = 'show_on_showcase'
     ) THEN
    ALTER TABLE public.deliveries RENAME COLUMN show_on_homepage TO show_on_showcase;
  END IF;
END $$;

-- folders.show_on_homepage → show_on_showcase
DO $$
BEGIN
  IF to_regclass('public.folders') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'folders' AND column_name = 'show_on_homepage'
     )
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'folders' AND column_name = 'show_on_showcase'
     ) THEN
    ALTER TABLE public.folders RENAME COLUMN show_on_homepage TO show_on_showcase;
  END IF;
END $$;

COMMENT ON COLUMN public.photographers.showcase_enabled IS
  'When true, the public Showcase (portfolio) page is enabled for this photographer.';
COMMENT ON COLUMN public.photographers.showcase_password IS
  'Optional password gate for the public Showcase page.';
COMMENT ON COLUMN public.photographers.showcase_slug IS
  'Public Showcase subdomain / portfolio slug identity.';
COMMENT ON COLUMN public.photographers.showcase_sort IS
  'Sort order for deliveries listed on the public Showcase.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deliveries' AND column_name = 'show_on_showcase'
  ) THEN
    EXECUTE $c$
      COMMENT ON COLUMN public.deliveries.show_on_showcase IS
        'When true, this delivery appears on the photographer public Showcase.';
    $c$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'folders' AND column_name = 'show_on_showcase'
  ) THEN
    EXECUTE $c$
      COMMENT ON COLUMN public.folders.show_on_showcase IS
        'When true, this folder is marked for Showcase visibility.';
    $c$;
  END IF;
END $$;
