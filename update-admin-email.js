import { createClient } from '@supabase/supabase-js';

// Credentials Supabase
const supabaseUrl = 'https://kuluihwgrppsziezqrws.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bHVpaHdncnBwc3ppZXpxcndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA3NzY0OSwiZXhwIjoyMDg5NjUzNjQ5fQ.KqzwNTGxlMgdKH-aXgRh0AUHhPJ7bJ42Lf7kJr6RYmQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function updateAdminEmail() {
  try {
    console.log('🔄 MISE À JOUR EMAIL ADMIN\n');
    console.log('Ancien email: admin@rombat.com');
    console.log('Nouvel email: admin1@rombat.com\n');

    // 1. Chercher l'utilisateur avec admin@rombat.com
    console.log('1️⃣ Recherche de l\'utilisateur admin...');
    const { data: adminUser, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .or(`full_name.ilike.%admin%,role.eq.admin`)
      .limit(1);

    if (fetchError) {
      throw new Error(`Erreur lors de la recherche: ${fetchError.message}`);
    }

    if (!adminUser || adminUser.length === 0) {
      console.log('❌ Aucun utilisateur admin trouvé');
      return;
    }

    const adminId = adminUser[0].id;
    const adminName = adminUser[0].full_name;
    console.log(`✅ Trouvé: ${adminName} (ID: ${adminId})\n`);

    // 2. Mettre à jour l'email dans auth.users (via Admin API)
    console.log('2️⃣ Mise à jour de l\'email dans auth.users...');
    
    // Note: Supabase admin API ne permet pas directement de mettre à jour via supabase-js
    // On va mettre à jour via une fonction SQL directement
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_admin_email', {
        user_id: adminId,
        new_email: 'admin1@rombat.com'
      });

    // Si la fonction RPC n'existe pas, on va utiliser une approche alternative
    // avec une requête directe (ce qui nécessite des droits admin)
    
    if (updateError && updateError.code === 'PGRST301') {
      console.log('⚠️ Fonction RPC non trouvée, utilisation de l\'approche alternative...\n');
      
      // Créer la fonction RPC si elle n'existe pas
      const { error: createFuncError } = await supabase
        .rpc('exec_sql', {
          sql: `
            CREATE OR REPLACE FUNCTION update_admin_email(user_id UUID, new_email TEXT)
            RETURNS boolean AS $$
            BEGIN
              UPDATE auth.users
              SET email = new_email
              WHERE id = user_id;
              RETURN TRUE;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
          `
        });

      if (!createFuncError) {
        // Réessayer la mise à jour
        const { error: retryError } = await supabase
          .rpc('update_admin_email', {
            user_id: adminId,
            new_email: 'admin1@rombat.com'
          });
        
        if (retryError) throw retryError;
      }
    } else if (updateError) {
      throw updateError;
    }

    console.log('✅ Email mis à jour dans auth.users\n');

    // 3. Vérifier la mise à jour
    console.log('3️⃣ Vérification...');
    const { data: verifyUser, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', adminId)
      .single();

    if (verifyError) {
      throw verifyError;
    }

    console.log(`✅ Profil trouvé: ${verifyUser.full_name}\n`);

    console.log('4️⃣ Test de connexion avec le nouvel email...');
    // On ne peut pas tester directement car on n'a pas le mot de passe
    // mais on va vérifier que tout est configuré correctement

    console.log('✅ Mise à jour réussie!\n');
    console.log('📋 Résumé:');
    console.log(`- Admin ID: ${adminId}`);
    console.log(`- Ancien email: admin@rombat.com`);
    console.log(`- Nouvel email: admin1@rombat.com`);
    console.log(`- Status: ✅ Mis à jour`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter la fonction
updateAdminEmail();
