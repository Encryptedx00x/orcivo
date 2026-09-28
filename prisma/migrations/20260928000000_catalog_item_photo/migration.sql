-- PB1-P30: one optional catalog image. The value is a private MinIO object key;
-- the API resolves it to a short-lived signed URL when reading the item.
ALTER TABLE "catalog_items" ADD COLUMN "photo_url" TEXT;
