-- Newly approved director features also apply to existing director memberships.
UPDATE "Membership" SET ceiling = ARRAY(
  SELECT DISTINCT permission FROM unnest(ceiling || ARRAY['staff.reset', 'audit.read']) permission
) WHERE role = 'DIRECTOR' AND cardinality(ceiling) > 0;
