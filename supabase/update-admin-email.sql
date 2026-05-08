-- ============================================================
-- Script de mise à jour email admin
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Afficher l'utilisateur admin actuel
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'admin@rombat.com';

-- 2. Mettre à jour l'email admin dans auth.users
UPDATE auth.users
SET email = 'admin1@rombat.com',
    email_confirmed_at = NOW()
WHERE email = 'admin@rombat.com';

-- 3. Vérifier la mise à jour
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'admin1@rombat.com';

-- 4. Vérifier que le profil est lié correctement
SELECT p.id, p.full_name, p.role, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'admin1@rombat.com';

-- 5. Afficher tous les utilisateurs pour vérification
SELECT u.id, u.email, p.full_name, p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
