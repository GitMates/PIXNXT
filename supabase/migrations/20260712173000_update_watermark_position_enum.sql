-- Add missing positions to watermark_position enum
ALTER TYPE watermark_position ADD VALUE IF NOT EXISTS 'top_center';
ALTER TYPE watermark_position ADD VALUE IF NOT EXISTS 'center_left';
ALTER TYPE watermark_position ADD VALUE IF NOT EXISTS 'center_right';
ALTER TYPE watermark_position ADD VALUE IF NOT EXISTS 'bottom_center';
