import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { miningService, supabase } from "../../config/supabase.js";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function Administration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState({
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
    admin_users: 0,
    updated_at: null
  });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users' ou 'settings'
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [sites, setSites] = useState([]);
  const [saving, setSaving] = useState(false);

  // États des formulaires
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'operator',
    department: '',
    site_id: '',
  });

  const [editUser, setEditUser] = useState({
    id: null,
    username: '',
    email: '',
    full_name: '',
    role: '',
    department: '',
    site_id: '',
  });

  // Paramètres système
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    backupTime: '02:00',
    emailNotifications: true,
    activityLogDays: 90,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiryDays: 90,
    requirePasswordChange: false
  });

  useEffect(() => {
    loadUsers();
    loadStats();
    supabase.from('sites').select('id, name, code').order('name').then(({ data }) => setSites(data || []));
  }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const result = await miningService.getUserStats('admin');
      if (result.error) throw result.error;
      setUserStats(result.data || userStats);
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };


  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const result = await miningService.getUsers('admin');
      if (result.error) throw result.error;
      
      setUsers(result.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      // Fallback vers des données vides en cas d'erreur
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };


  // Ajouter un utilisateur
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.full_name) {
      toast.error('Remplissez tous les champs obligatoires (*)');
      return;
    }
    if (!newUser.password || newUser.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setSaving(true);
    const result = await miningService.createUser(newUser.email, newUser.password, {
      username:   newUser.username,
      full_name:  newUser.full_name,
      role:       newUser.role,
      department: newUser.department,
      site_id:    newUser.site_id || null,
    });
    setSaving(false);
    if (result.error) {
      toast.error('Erreur : ' + result.error.message);
      return;
    }
    toast.success('Utilisateur créé avec succès');
    setShowAddModal(false);
    setNewUser({ username: '', email: '', password: '', full_name: '', role: 'operator', department: '', site_id: '' });
    await Promise.all([loadUsers(), loadStats()]);
  };


  // Modifier un utilisateur
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditUser({
      id:         user.id,
      username:   user.username,
      email:      user.email,
      full_name:  user.full_name,
      role:       user.role,
      department: user.department || '',
      site_id:    user.site_id || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser.username || !editUser.email || !editUser.full_name) {
      toast.error('Remplissez tous les champs obligatoires (*)');
      return;
    }
    setSaving(true);
    const result = await miningService.updateUser(editUser.id, {
      username:   editUser.username,
      full_name:  editUser.full_name,
      role:       editUser.role,
      department: editUser.department,
      site_id:    editUser.site_id || null,
    });
    setSaving(false);
    if (result.error) { toast.error('Erreur : ' + result.error.message); return; }
    toast.success('Utilisateur modifié');
    setShowEditModal(false);
    setSelectedUser(null);
    await Promise.all([loadUsers(), loadStats()]);
  };


  // Activer/Désactiver un utilisateur
  const handleToggleUserStatus = async (userId) => {
    try {
      const u = users.find(u => u.id === userId);
      if (!u) return;
      const result = await miningService.updateUser(userId, { is_active: !u.is_active });
      if (result.error) throw result.error;
      toast.success(u.is_active ? 'Utilisateur désactivé' : 'Utilisateur activé');
      await Promise.all([loadUsers(), loadStats()]);
    } catch (error) {
      toast.error('Erreur statut : ' + (error.message || 'Erreur inconnue'));
    }
  };


  // Supprimer un utilisateur
  const handleDeleteUser = async () => {
    if (!confirmDeleteId) return;
    const result = await miningService.deleteUser(confirmDeleteId);
    if (result.error) { toast.error('Erreur suppression : ' + result.error.message); return; }
    toast.success('Utilisateur supprimé');
    setConfirmDeleteId(null);
    await Promise.all([loadUsers(), loadStats()]);
  };


  // Sauvegarder les paramètres
  const handleSaveSettings = () => {
    alert('Paramètres sauvegardés avec succès!');
    setShowSettingsModal(false);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'var(--color-primary)';
      case 'supervisor': return 'var(--color-warning)';
      case 'operator': return 'var(--color-success)';
      case 'directeur': return '#8B5CF6';
      case 'chef_de_site': return '#F59E0B';
      case 'comptable': return '#10B981';
      default: return 'var(--color-muted-foreground)';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'supervisor': return 'Superviseur';
      case 'operator': return 'Opérateur';
      case 'directeur': return 'Directeur';
      case 'chef_de_site': return 'Chef de site';
      case 'comptable': return 'Comptable';
      default: return role;
    }
  };

  return (
    <AppLayout userRole={user?.role} userName={user?.full_name} userSite="Amp Mines et Carrieres Exploration & Mines">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
            Administration
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            Gestion des utilisateurs et paramètres système
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            iconName="UserPlus"
            iconPosition="left"
            onClick={() => setShowAddModal(true)}
          >
            Ajouter Utilisateur
          </Button>
          <Button
            variant="outline"
            iconName="Settings"
            iconPosition="left"
            onClick={() => {
              setActiveTab('settings');
              setShowSettingsModal(true);
            }}
          >
            Paramètres
          </Button>
          <Button
            variant="outline"
            iconName="ArrowLeft"
            iconPosition="left"
            onClick={() => navigate("/")}
          >
            Retour
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'users' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Icon name="Users" size={16} className="inline mr-2" />
          Utilisateurs
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'settings' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Icon name="Settings" size={16} className="inline mr-2" />
          Paramètres Système
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(49,130,206,0.12)" }}>
                  <Icon name="Users" size={20} color="#3182CE" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Total Utilisateurs</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                    {loadingStats ? '...' : userStats.total_users}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,161,105,0.12)" }}>
                  <Icon name="CheckCircle" size={20} color="var(--color-success)" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Actifs</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                    {loadingStats ? '...' : userStats.active_users}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(229,62,62,0.12)" }}>
                  <Icon name="Shield" size={20} color="var(--color-error)" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Admins</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                    {loadingStats ? '...' : userStats.admin_users}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(214,158,46,0.12)" }}>
                  <Icon name="Clock" size={20} color="var(--color-warning)" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Inactifs</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                    {loadingStats ? '...' : userStats.inactive_users}
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* Users table */}
          <div className="rounded-xl border" style={{ background: "var(--color-card)" }}>
            <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
                Gestion des Utilisateurs
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Utilisateur</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Email</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Rôle</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Département</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Statut</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Dernière Connexion</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                        Chargement...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (

                    <tr>
                      <td colSpan="7" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                        <td className="p-4">
                          <div>
                            <p className="font-medium" style={{ color: "var(--color-foreground)" }}>{user.full_name}</p>
                            <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>@{user.username}</p>
                          </div>
                        </td>
                        <td className="p-4" style={{ color: "var(--color-foreground)" }}>{user.email}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium" 
                            style={{ 
                              background: `${getRoleColor(user.role)}15`,
                              color: getRoleColor(user.role)
                            }}>
                            {getRoleText(user.role)}
                          </span>
                        </td>
                        <td className="p-4" style={{ color: "var(--color-foreground)" }}>{user.department}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium" 
                            style={{ 
                              background: user.is_active ? "rgba(56,161,105,0.12)" : "rgba(148,163,184,0.12)",
                              color: user.is_active ? "var(--color-success)" : "var(--color-muted-foreground)"
                            }}>
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="p-4" style={{ color: "var(--color-foreground)" }}>{user.last_login || 'Jamais'}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditUser(user)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                              title="Modifier"
                            >
                              <Icon name="Edit" size={16} color="var(--color-primary)" />
                            </button>
                            <button 
                              onClick={() => handleToggleUserStatus(user.id)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                              title={user.is_active ? "Désactiver" : "Activer"}
                            >
                              <Icon 
                                name={user.is_active ? "UserMinus" : "UserPlus"} 
                                size={16} 
                                color={user.is_active ? "var(--color-warning)" : "var(--color-success)"} 
                              />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(user.id)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                              title="Supprimer"
                            >
                              <Icon name="Trash2" size={16} color="var(--color-error)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Paramètres Système */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
                Sauvegarde
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>Sauvegardes Automatiques</p>
                    <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Effectuer des sauvegardes quotidiennes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.autoBackup}
                      onChange={(e) => setSystemSettings({...systemSettings, autoBackup: e.target.checked})}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Heure de sauvegarde
                  </label>
                  <input
                    type="time"
                    value={systemSettings.backupTime}
                    onChange={(e) => setSystemSettings({...systemSettings, backupTime: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
                Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>Notifications Email</p>
                    <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Recevoir les alertes par email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.emailNotifications}
                      onChange={(e) => setSystemSettings({...systemSettings, emailNotifications: e.target.checked})}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
                Sécurité
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Durée de conservation du journal (jours)
                  </label>
                  <input
                    type="number"
                    value={systemSettings.activityLogDays}
                    onChange={(e) => setSystemSettings({...systemSettings, activityLogDays: parseInt(e.target.value)})}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Délai d'expiration de session (minutes)
                  </label>
                  <input
                    type="number"
                    value={systemSettings.sessionTimeout}
                    onChange={(e) => setSystemSettings({...systemSettings, sessionTimeout: parseInt(e.target.value)})}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Nombre max de tentatives de connexion
                  </label>
                  <input
                    type="number"
                    value={systemSettings.maxLoginAttempts}
                    onChange={(e) => setSystemSettings({...systemSettings, maxLoginAttempts: parseInt(e.target.value)})}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
                Politique de Mot de Passe
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Expiration du mot de passe (jours)
                  </label>
                  <input
                    type="number"
                    value={systemSettings.passwordExpiryDays}
                    onChange={(e) => setSystemSettings({...systemSettings, passwordExpiryDays: parseInt(e.target.value)})}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>Changement de mot de passe obligatoire</p>
                    <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Forcer le changement au premier login</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.requirePasswordChange}
                      onChange={(e) => setSystemSettings({...systemSettings, requirePasswordChange: e.target.checked})}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="default" onClick={handleSaveSettings}>
              Sauvegarder les Paramètres
            </Button>
          </div>
        </>
      )}

      {/* Modal Ajout Utilisateur */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
              Ajouter un Utilisateur
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Nom d'utilisateur *
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  placeholder="ex: jdupont"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  placeholder="ex: jdupont@rombat.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Mot de passe * (min. 6 caractères)
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  placeholder="Mot de passe initial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Nom Complet *
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  placeholder="ex: Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Rôle *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                >
                  <option value="operator">Opérateur</option>
                  <option value="supervisor">Superviseur</option>
                  <option value="chef_de_site">Chef de site</option>
                  <option value="comptable">Comptable</option>
                  <option value="secretaire">Secrétaire</option>
                  <option value="equipement">Équipement</option>
                  <option value="directeur">Directeur (PDG)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Carrière / Site
                </label>
                <select
                  value={newUser.site_id}
                  onChange={(e) => setNewUser({...newUser, site_id: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                >
                  <option value="">— Toutes les carrières (accès global) —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Département
                </label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  placeholder="ex: Production"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Annuler</Button>
              <button
                onClick={handleAddUser}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
                style={{ background: saving ? '#94A3B8' : 'var(--color-primary)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Création...' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modification Utilisateur */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
              Modifier l'Utilisateur
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Nom d'utilisateur *
                </label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Nom Complet *
                </label>
                <input
                  type="text"
                  value={editUser.full_name}
                  onChange={(e) => setEditUser({...editUser, full_name: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Rôle *
                </label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                >
                  <option value="operator">Opérateur</option>
                  <option value="supervisor">Superviseur</option>
                  <option value="chef_de_site">Chef de site</option>
                  <option value="comptable">Comptable</option>
                  <option value="secretaire">Secrétaire</option>
                  <option value="equipement">Équipement</option>
                  <option value="directeur">Directeur (PDG)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Carrière / Site
                </label>
                <select
                  value={editUser.site_id || ''}
                  onChange={(e) => setEditUser({...editUser, site_id: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                >
                  <option value="">— Toutes les carrières (accès global) —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Département
                </label>
                <input
                  type="text"
                  value={editUser.department}
                  onChange={(e) => setEditUser({...editUser, department: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Annuler</Button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: saving ? '#94A3B8' : 'var(--color-primary)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl p-6 w-full max-w-sm shadow-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-foreground)" }}>Supprimer l'utilisateur</h3>
            <p className="text-sm mb-6" style={{ color: "var(--color-muted-foreground)" }}>
              Cette action est irréversible. L'utilisateur sera définitivement supprimé.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--color-error)", color: "#fff", border: "none", cursor: "pointer" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
