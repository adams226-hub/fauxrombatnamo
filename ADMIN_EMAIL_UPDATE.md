# 📝 Guide: Mise à jour email admin et vérification Supabase

## 🎯 Objectif
- ✅ Changer l'email admin de `admin@rombat.com` à `admin1@rombat.com`
- ✅ Vérifier la connexion à Supabase
- ✅ Tester la création de compte
- ✅ Pousser sur GitHub

---

## 📋 ÉTAPE 1: Mettre à jour l'email dans Supabase

### Accéder à Supabase SQL Editor:
1. Aller sur https://app.supabase.com
2. Sélectionner le projet `rombat-mining-platform`
3. Aller dans **SQL Editor** → **New Query**
4. Copier-coller le script ci-dessous

### Script SQL à exécuter:

```sql
-- ============================================================
-- MISE À JOUR EMAIL ADMIN
-- ============================================================

-- 1. Vérifier l'utilisateur admin actuel
SELECT id, email, role FROM auth.users 
WHERE email = 'admin@rombat.com'
LIMIT 1;

-- 2. Mettre à jour l'email
UPDATE auth.users
SET email = 'admin1@rombat.com',
    email_confirmed_at = NOW()
WHERE email = 'admin@rombat.com';

-- 3. Vérifier la mise à jour
SELECT id, email FROM auth.users 
WHERE email = 'admin1@rombat.com';

-- 4. Afficher tous les utilisateurs avec leurs profils
SELECT u.id, u.email, p.full_name, p.role, p.is_active
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
```

### Résultat attendu:
- ✅ 1 ligne avec `admin@rombat.com` (avant)
- ✅ 1 ligne UPDATE avec le nouvel email
- ✅ 1 ligne avec `admin1@rombat.com` (après)
- ✅ Liste complète des utilisateurs avec emails actualisés

---

## 🔗 ÉTAPE 2: Tester la connexion à Supabase

### Credentials Supabase:
```
URL: https://kuluihwgrppsziezqrws.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bHVpaHdncnBwc3ppZXpxcndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNzc2NDksImV4cCI6MjA4OTY1MzY0OX0.hxcTNdiozovD5I3WtYsqvo4wb_bWNFchd7TMrU1-uHU
```

### Vérifications à faire:
- [ ] Accéder à Supabase Dashboard
- [ ] Vérifier que l'email est changé dans **Authentication** → **Users**
- [ ] Vérifier que le profil existe dans **Database** → **profiles**
- [ ] Vérifier les autres utilisateurs

---

## ✅ ÉTAPE 3: Tester la création de compte

### Tester l'application:
1. Démarrer l'application locale: `npm run dev`
2. Aller sur http://localhost:5173
3. Tester la connexion:
   - Email: `admin1@rombat.com`
   - Mot de passe: `Admin@2026!`
4. Si la connexion fonctionne ✅, l'application est prête

### Tester la création de compte:
1. Aller dans **Administration** → **Gestion des utilisateurs**
2. Créer un nouvel utilisateur de test
3. Vérifier que l'utilisateur est créé correctement
4. Vérifier que les permissions fonctionnent

---

## 🚀 ÉTAPE 4: Pousser sur GitHub

Une fois que tout est testé et fonctionne:

```bash
# 1. Vérifier le statut
git status

# 2. Ajouter les fichiers modifiés
git add .

# 3. Créer un commit
git commit -m "Update: Change admin email from admin@rombat.com to admin1@rombat.com"

# 4. Pousser sur GitHub
git push origin main
```

---

## 📊 Vérification complète

### Avant la mise à jour:
- Email admin: `admin@rombat.com`
- Utilisateurs: [voir liste dans Supabase]

### Après la mise à jour:
- ✅ Email admin: `admin1@rombat.com`
- ✅ Tous les utilisateurs visibles
- ✅ Connexion fonctionne
- ✅ Création de compte fonctionne
- ✅ Push sur GitHub réussi

---

## 🆘 Dépannage

### Problème: "Email déjà utilisé"
→ Supprimer l'ancien compte ou vérifier qu'il n'existe pas

### Problème: "Connexion échouée"
→ Vérifier les credentials dans `.env`

### Problème: "Création de compte échouée"
→ Vérifier les permissions RLS dans Supabase

### Problème: "RLS bloque l'accès"
→ Vérifier les règles RLS dans Supabase → Authentication → Policies

---

## 📞 Besoin d'aide?

1. Vérifier les logs Supabase
2. Vérifier la console du navigateur (F12)
3. Vérifier les erreurs dans les logs Node.js

---

**Statut: ✅ PRÊT POUR PRODUCTION**

Tous les scripts et guides sont en place. La mise à jour email peut maintenant être exécutée en toute confiance!
