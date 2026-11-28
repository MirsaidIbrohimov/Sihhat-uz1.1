CREATE TABLE IF NOT EXISTS "BookingReference" (
    "reference" TEXT NOT NULL,
    "bookingId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingReference_pkey" PRIMARY KEY ("reference")
);

INSERT INTO "BookingReference" ("reference", "bookingId")
SELECT "reference", "id"
FROM "Booking"
WHERE "reference" ~ '^BR-[0-9]{5}$'
ON CONFLICT ("reference") DO NOTHING;

DO $$
DECLARE
  rec RECORD;
  candidate TEXT;
  inserted TEXT;
BEGIN
  FOR rec IN
    SELECT "id"
    FROM "Booking"
    WHERE "reference" !~ '^BR-[0-9]{5}$'
    ORDER BY "createdAt" ASC, "id" ASC
  LOOP
    LOOP
      candidate := 'BR-' || lpad((10000 + floor(random() * 90000)::int)::text, 5, '0');
      inserted := NULL;
      IF NOT EXISTS (SELECT 1 FROM "Booking" WHERE "reference" = candidate) THEN
        INSERT INTO "BookingReference" ("reference", "bookingId")
        VALUES (candidate, rec."id")
        ON CONFLICT ("reference") DO NOTHING
        RETURNING "reference" INTO inserted;
        IF inserted IS NOT NULL THEN
          UPDATE "Booking" SET "reference" = candidate WHERE "id" = rec."id";
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;
