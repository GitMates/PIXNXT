-- Per-set video counts + keep delivery/set photo & video counts in sync with photos rows.

ALTER TABLE public.sets
  ADD COLUMN IF NOT EXISTS video_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sets.video_count IS 'Videos in this set; synced from photos.media_type.';

CREATE OR REPLACE FUNCTION public.pixnxt_is_gallery_video(p_media_type text, p_filename text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    COALESCE(p_media_type, '') = 'video'
    OR COALESCE(p_filename, '') ~* '\.(mp4|webm|ogg|mov)$';
$$;

CREATE OR REPLACE FUNCTION public.refresh_delivery_media_counts(p_delivery_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photo_count integer;
  v_video_count integer;
BEGIN
  IF p_delivery_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    count(*) FILTER (WHERE NOT public.pixnxt_is_gallery_video(media_type::text, filename)),
    count(*) FILTER (WHERE public.pixnxt_is_gallery_video(media_type::text, filename))
  INTO v_photo_count, v_video_count
  FROM public.photos
  WHERE collection_id = p_delivery_id;

  UPDATE public.deliveries
  SET
    photo_count = COALESCE(v_photo_count, 0),
    video_count = COALESCE(v_video_count, 0),
    updated_at = now()
  WHERE id = p_delivery_id;

  UPDATE public.sets s
  SET
    photo_count = COALESCE(sub.pc, 0),
    video_count = COALESCE(sub.vc, 0),
    updated_at = now()
  FROM (
    SELECT
      p.set_id,
      count(*) FILTER (WHERE NOT public.pixnxt_is_gallery_video(p.media_type::text, p.filename)) AS pc,
      count(*) FILTER (WHERE public.pixnxt_is_gallery_video(p.media_type::text, p.filename)) AS vc
    FROM public.photos p
    WHERE p.collection_id = p_delivery_id
      AND p.set_id IS NOT NULL
    GROUP BY p.set_id
  ) sub
  WHERE s.id = sub.set_id
    AND s.collection_id = p_delivery_id;

  UPDATE public.sets
  SET photo_count = 0, video_count = 0, updated_at = now()
  WHERE collection_id = p_delivery_id
    AND id NOT IN (
      SELECT DISTINCT set_id
      FROM public.photos
      WHERE collection_id = p_delivery_id
        AND set_id IS NOT NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_delivery_media_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_id uuid;
BEGIN
  v_delivery_id := COALESCE(NEW.collection_id, OLD.collection_id);
  PERFORM public.refresh_delivery_media_counts(v_delivery_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS photos_refresh_delivery_media_counts ON public.photos;
CREATE TRIGGER photos_refresh_delivery_media_counts
  AFTER INSERT OR UPDATE OF collection_id, set_id, media_type, filename OR DELETE
  ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_refresh_delivery_media_counts();

-- Backfill existing deliveries and sets.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.deliveries LOOP
    PERFORM public.refresh_delivery_media_counts(r.id);
  END LOOP;
END;
$$;
