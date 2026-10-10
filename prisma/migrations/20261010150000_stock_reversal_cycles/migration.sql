ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "reversal_of_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movements_reversal_of_id_key"
  ON "stock_movements"("reversal_of_id");
DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reversal_of_id_fkey"
    FOREIGN KEY ("reversal_of_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
