-- Migration: Add Homepage Settings columns to photographers table
-- Run this in Supabase SQL Editor if you are doing it manually.

ALTER TABLE photographers 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS homepage_password TEXT,
ADD COLUMN IF NOT EXISTS homepage_sort TEXT DEFAULT 'created-new',
ADD COLUMN IF NOT EXISTS show_bio BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_social BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_website BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_address BOOLEAN DEFAULT true;
