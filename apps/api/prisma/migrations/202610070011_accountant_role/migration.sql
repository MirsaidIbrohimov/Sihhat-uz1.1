ALTER TABLE "Membership" DROP CONSTRAINT membership_role;
ALTER TABLE "Membership" ADD CONSTRAINT membership_role CHECK (role IN ('DIRECTOR', 'RECEPTION', 'ACCOUNTANT'));
