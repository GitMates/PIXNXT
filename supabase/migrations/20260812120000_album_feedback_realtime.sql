-- Enable live feedback sync (comments, pins/audio, swaps, replies) across
-- client link, photographer preview, and album editor without a page reload.

DO $$
BEGIN
  ALTER TABLE public.album_proofer_comments REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.album_proofer_photo_pins REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.album_proofer_swap_marks REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.album_proofer_proof_replies REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.album_proofer_albums REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.album_proofer_comments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.album_proofer_photo_pins;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.album_proofer_swap_marks;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.album_proofer_proof_replies;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.album_proofer_albums;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;
