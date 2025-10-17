-- Add base_url column to existing qr_codes table
-- This migration is safe to run on existing databases
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS base_url TEXT;
