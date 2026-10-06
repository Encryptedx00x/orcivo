-- Client approval by photo of the signature is on by default.
ALTER TABLE "companies" ALTER COLUMN "allowed_approval_methods" SET DEFAULT ARRAY['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE', 'PHOTO_SIGNATURE']::"ApprovalMethod"[];

-- Companies still on the old untouched default also get it.
UPDATE "companies" SET "allowed_approval_methods" = ARRAY['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE', 'PHOTO_SIGNATURE']::"ApprovalMethod"[]
WHERE "allowed_approval_methods" = ARRAY['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE']::"ApprovalMethod"[];
