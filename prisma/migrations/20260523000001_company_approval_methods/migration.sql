ALTER TABLE "companies" ADD COLUMN "allowed_approval_methods" "ApprovalMethod"[] NOT NULL DEFAULT ARRAY['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE']::"ApprovalMethod"[];
