BEGIN;
ALTER TABLE "Invoice" ADD CONSTRAINT invoice_scope_unique UNIQUE(id,"sanatoriumId");
ALTER TABLE "PaymentOrder" ADD CONSTRAINT payment_invoice_scope FOREIGN KEY ("invoiceId","sanatoriumId") REFERENCES "Invoice"(id,"sanatoriumId");
ALTER TABLE "PaymentOrder" ADD CONSTRAINT payment_status CHECK (status IN ('CREATED','PENDING','SUCCEEDED','FAILED','CANCELLED'));
ALTER TABLE "PaymentOrder" ADD CONSTRAINT payment_purpose CHECK ((purpose='BOOKING' AND "bookingId" IS NOT NULL) OR (purpose IN ('AD','SUBSCRIPTION') AND "invoiceId" IS NOT NULL));
ALTER TABLE "Booking" ADD CONSTRAINT booking_status CHECK (status IN ('HOLD','PAYMENT_PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','EXPIRED','NO_SHOW','PAYMENT_EXCEPTION'));
ALTER TABLE "ProviderTransaction" ADD CONSTRAINT provider_state CHECK (state IN (1,2,-1,-2));
ALTER TABLE "RefundRequest" ADD CONSTRAINT refund_state CHECK (status IN ('REQUESTED','APPROVED','PROCESSING','SUCCEEDED','REJECTED','FAILED'));
ALTER TABLE "Payout" ADD CONSTRAINT payout_state CHECK (status IN ('DRAFT','APPROVED','PROCESSING','PAID','FAILED','CANCELLED'));
ALTER TABLE "LedgerLine" ADD CONSTRAINT ledger_account CHECK (account IN ('PSP_CLEARING','BANK','SANATORIUM_PAYABLE','REFUND_PAYABLE','PAYOUT_IN_TRANSIT','DEFERRED_SERVICE_REVENUE','SUBSCRIPTION_REVENUE','AD_REVENUE','PROCESSING_EXPENSE','RECEIVABLE'));
CREATE FUNCTION refund_original_amount() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original bigint;
BEGIN SELECT amount INTO original FROM "Booking" WHERE id=NEW."bookingId" AND "sanatoriumId"=NEW."sanatoriumId";
IF original IS NULL OR NEW.amount<>original THEN RAISE EXCEPTION 'MVP supports exactly the original full refund' USING ERRCODE='23514'; END IF; RETURN NEW; END $$;
CREATE TRIGGER full_refund_amount BEFORE INSERT OR UPDATE OF amount,"bookingId","sanatoriumId" ON "RefundRequest" FOR EACH ROW EXECUTE FUNCTION refund_original_amount();
COMMIT;
