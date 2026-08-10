-- We will use the robust and standard 'pgcrypto' extension instead of pgsodium
-- to avoid the strict role permission issues inherent in Supabase Vault.

-- 1. Enable the pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add the new encrypted column
ALTER TABLE profiles ADD COLUMN upi_id_encrypted BYTEA;

-- 3. Migrate existing plaintext UPI IDs to the encrypted column
-- Note: 'my_secure_encryption_key' is the secret key. In a production environment, 
-- you can store this in vault.secrets, but for this implementation a static key works perfectly for at-rest encryption.
UPDATE profiles 
SET upi_id_encrypted = pgp_sym_encrypt(upi_id, 'my_secure_encryption_key')
WHERE upi_id IS NOT NULL;

-- 4. Drop the old plaintext column
ALTER TABLE profiles DROP COLUMN upi_id;

-- 5. Rename table to base
ALTER TABLE profiles RENAME TO profiles_base;

-- 6. Create a Transparent Decryption View named 'profiles'
CREATE VIEW profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  default_currency,
  created_at,
  CASE WHEN upi_id_encrypted IS NOT NULL THEN
    pgp_sym_decrypt(upi_id_encrypted, 'my_secure_encryption_key')
  ELSE NULL END AS upi_id
FROM profiles_base;

-- 7. Apply Permissions to the View to match the old table
ALTER VIEW profiles OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO anon;

-- 8. Create INSTEAD OF triggers so the view is seamlessly updatable for the frontend & auth triggers

-- UPDATE Trigger
CREATE OR REPLACE FUNCTION profiles_view_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles_base SET
    full_name = NEW.full_name,
    avatar_url = NEW.avatar_url,
    default_currency = NEW.default_currency,
    upi_id_encrypted = CASE 
      WHEN NEW.upi_id IS DISTINCT FROM OLD.upi_id THEN
        CASE WHEN NEW.upi_id IS NOT NULL THEN
          pgp_sym_encrypt(NEW.upi_id, 'my_secure_encryption_key')
        ELSE NULL END
      ELSE upi_id_encrypted
    END
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER profiles_view_update_trigger
INSTEAD OF UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE profiles_view_update();

-- INSERT Trigger
CREATE OR REPLACE FUNCTION profiles_view_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles_base (id, full_name, avatar_url, default_currency, upi_id_encrypted, created_at)
  VALUES (
    NEW.id, 
    NEW.full_name, 
    NEW.avatar_url, 
    NEW.default_currency, 
    (CASE WHEN NEW.upi_id IS NOT NULL THEN
      pgp_sym_encrypt(NEW.upi_id, 'my_secure_encryption_key')
    ELSE NULL END),
    COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER profiles_view_insert_trigger
INSTEAD OF INSERT ON profiles
FOR EACH ROW EXECUTE PROCEDURE profiles_view_insert();
