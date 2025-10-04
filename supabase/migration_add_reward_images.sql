-- Migration: Add image_url field to rewards table
-- This migration adds support for reward images

ALTER TABLE rewards ADD COLUMN image_url TEXT;

-- Use existing restaurant-assets storage bucket with a rewards folder
-- The bucket configuration should be:
-- Name: restaurant-assets (existing bucket)
-- Public: true (for displaying images)
-- File size limit: 5MB
-- Allowed file types: image/jpeg, image/png, image/webp
-- Images will be stored in a "rewards" folder within this bucket

-- Storage policies for restaurant-assets bucket:
-- Allow public read access for all files
-- Allow authenticated users to upload/delete (for admins only via RLS)

-- Note: Ensure the restaurant-assets bucket exists and has proper policies configured
