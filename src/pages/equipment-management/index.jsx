import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { miningService } from "../../config/supabase";
import { toastError, toastSuccess } from "../../utils/toast";

export default function EquipmentManagement() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);

  const [newEquipment, setNewEquipment] = useState({
    name: '',
    type: '',
    type_custom: '',
    model: '',
    serial_number: '',
    location: '',
    status: 'active'
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEquipment, setEditEquipment] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [filterEquipStatus, setFilterEquipStatus] = useState('all');
  const [filterEquipSearch, setFilterEquipSearch] = useState('');

  useEffect(() => {
    fetchEquipmentData();
  }, []);

  const fetchEquipmentData = async () => {
    setLoading(true);
    try {
      // appeler le service back-end en passant le rôle de l'utilisateur
      const { data, error } = await miningService.getEquipment(user?.role);
      if (error) throw error;
      if (data) {
        // Filtrer les équipements retraités (soft-deleted)
        setEquipment(data);
      } else {
        setEquipment([]);
      }
    } catch (error) {
      console.error("Erreur chargement équipements:", error);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async () => {
    const finalType = newEquipment.type === 'autre'
      ? (newEquipment.type_custom.trim() || '')
      : newEquipment.type;

    if (!newEquipment.name || !finalType || !newEquipment.model) {
      toastError('Veuillez remplir les champs obligatoires (Code Engin, Type, Modèle)');
      return;
    }

    try {
      const equipmentToAdd = {
        name: newEquipment.name,
        type: finalType,
        model: newEquipment.model,
        serial_number: newEquipment.serial_number || `EQ-${Date.now()}`,
        status: newEquipment.status || 'active',
        purchase_date: new Date().toISOString().split('T')[0],
        location: newEquipment.location || null,
      };
      const { error } = await miningService.createEquipment(equipmentToAdd);
      if (error) throw error;
      await fetchEquipmentData();
      setShowAddModal(false);
      setNewEquipment({ name: '', type: '', type_custom: '', model: '', serial_number: '', location: '', status: 'active' });
      toastSuccess('Équipement ajouté avec succès');
    } catch (error) {
      console.error("Erreur ajout équipement:", error);
      toastError(`Erreur lors de l'ajout: ${error.message || 'Vérifiez vos permissions'}`);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!confirmDeleteId) return;
    try {
      const { error } = await miningService.deleteEquipment(confirmDeleteId);
      if (error) throw error;
      toastSuccess('Équipement supprimé');
      setConfirmDeleteId(null);
      await fetchEquipmentData();
    } catch (error) {
      toastError('Erreur suppression: ' + error.message);
      setConfirmDeleteId(null);
    }
  };

  const handleEditStatus = async () => {
    try {
      const { error } = await miningService.updateEquipment(editEquipment.id, {
        status: editEquipment.status
      });
      if (error) throw error;
      await fetchEquipmentData();
      setShowEditModal(false);
      toastSuccess('Équipement mis à jour');
    } catch (error) {
      toastError('Erreur mise à jour: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'functional':
        return 'var(--color-success)';
      case 'maintenance':
      case 'en_reparation':
        return 'var(--color-warning)';
      case 'offline':
      case 'hors_service':
      case 'panne':
        return 'var(--color-error)';
      default:
        return 'var(--color-muted-foreground)';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
      case 'functional':
        return 'Fonctionnel';
      case 'maintenance':
        return 'Maintenance';
      case 'offline':
      case 'hors_service':
        return 'Hors service';
      case 'panne':
        return 'Panne';
      case 'en_reparation':
        return 'En réparation';
      default:
        return status;
    }
  };

  const EQUIPMENT_TYPES = [
    { value: 'excavator', label: 'Pelle hydraulique' },
    { value: 'drill',     label: 'Foreuse' },
    { value: 'truck',     label: 'Camion benne' },
    { value: 'loader',    label: 'Chargeuse' },
    { value: 'crusher',   label: 'Concasseur' },
    { value: 'conveyor',  label: 'Convoyeur' },
    { value: 'pump',      label: 'Pompe' },
    { value: 'generator', label: 'Groupe électrogène' },
    { value: 'autre',     label: 'Autre (préciser)' },
  ];

  const filteredEquipment = equipment.filter(e => {
    if (filterEquipStatus !== 'all' && e.status !== filterEquipStatus) return false;
    if (filterEquipSearch) {
      const s = filterEquipSearch.toLowerCase();
      if (!e.name?.toLowerCase().includes(s) && !e.type?.toLowerCase().includes(s) && !e.model?.toLowerCase().includes(s) && !e.location?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const getMachineTypeLabel = (type) => {
    const found = EQUIPMENT_TYPES.find(t => t.value === type);
    return found ? found.label : (type || '');
  };

  return (
    <AppLayout userRole={user?.role} userName={user?.full_name} userSite="Amp Mines et Carrieres">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
            Gestion des Équipements
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            Suivi du parc matériel et des opérations quotidiennes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            iconName="Plus"
            iconPosition="left"
            onClick={() => setShowAddModal(true)}
          >
            Nouvel Équipement
          </Button>
          <Button
            variant="outline"
            iconName="RefreshCw"
            iconPosition="left"
            onClick={() => {
              // relancer la requête API pour récupérer les équipements
              fetchEquipmentData();
            }}
          >
            Actualiser les données
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

      {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,161,105,0.12)" }}>
                  <Icon name="Truck" size={20} color="var(--color-success)" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Total</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>{equipment.length}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,161,105,0.12)" }}>
                  <Icon name="CheckCircle" size={20} color="var(--color-success)" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Fonctionnels</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                    {equipment.filter(e => e.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(214,158,46,0.12)" }}>
                  <Icon name="Tool" size={20} color="var(--color-warning)" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Maintenance</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                    {equipment.filter(e => e.status === 'maintenance').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(229,62,62,0.12)" }}>
                  <Icon name="XCircle" size={20} color="var(--color-error)" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Hors service</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                    {equipment.filter(e => e.status === 'offline').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtres équipements */}
          <div className="rounded-xl border p-4 mb-4" style={{ background: "var(--color-card)" }}>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-2">
                <Icon name="Filter" size={16} color="var(--color-muted-foreground)" />
                <span className="text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Filtres</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Statut</label>
                <select value={filterEquipStatus} onChange={e => setFilterEquipStatus(e.target.value)}
                  className="p-2 rounded border text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)", minWidth: '140px' }}>
                  <option value="all">Tous</option>
                  <option value="active">Fonctionnel</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Hors service</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1" style={{ minWidth: '200px' }}>
                <label className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Recherche (code / type / modèle)</label>
                <input type="text" value={filterEquipSearch} onChange={e => setFilterEquipSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="p-2 rounded border text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
              </div>
              <button onClick={() => { setFilterEquipStatus('all'); setFilterEquipSearch(''); }}
                className="px-3 py-2 rounded border text-sm transition-colors hover:bg-muted"
                style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}>
                Réinitialiser
              </button>
              <span className="text-xs self-end pb-2" style={{ color: "var(--color-muted-foreground)" }}>
                {filteredEquipment.length} équipement{filteredEquipment.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Equipment table */}
          <div className="rounded-xl border" style={{ background: "var(--color-card)" }}>
            <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
                Liste des Équipements
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Code Engin</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Type</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Modèle</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Localisation</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Statut</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                        Chargement...
                      </td>
                    </tr>
                  ) : filteredEquipment.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                        Aucun équipement trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredEquipment.map((item) => (
                      <tr key={item.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                        <td className="p-4">
                          <div>
                            <p className="font-medium" style={{ color: "var(--color-foreground)" }}>{item.name}</p>
                            <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{item.serial_number}</p>
                          </div>
                        </td>
                        <td className="p-4" style={{ color: "var(--color-foreground)" }}>{getMachineTypeLabel(item.type)}</td>
                        <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.model}</td>
                        <td className="p-4" style={{ color: "var(--color-muted-foreground)" }}>{item.location || '—'}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: `${getStatusColor(item.status)}15`,
                              color: getStatusColor(item.status)
                            }}>
                            {getStatusText(item.status)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditEquipment({ ...item }); setShowEditModal(true); }}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-muted"
                              style={{ color: "var(--color-primary)" }}
                              title="Modifier le statut"
                            >
                              <Icon name="Edit" size={13} color="var(--color-primary)" />
                              Modifier
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-muted"
                              style={{ color: "var(--color-error)" }}
                              title="Supprimer"
                            >
                              <Icon name="Trash2" size={13} color="var(--color-error)" />
                              Suppr.
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

      {/* Modal Ajout Équipement */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
              Ajouter un équipement
            </h3>
            <div className="space-y-4">
              {/* Type en premier — champ le plus important */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Type d'équipement *</label>
                <select
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  value={newEquipment.type}
                  onChange={(e) => setNewEquipment({...newEquipment, type: e.target.value, type_custom: ''})}
                >
                  <option value="">— Sélectionner un type —</option>
                  {EQUIPMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {newEquipment.type === 'autre' && (
                  <input
                    type="text"
                    placeholder="Précisez le type d'équipement..."
                    value={newEquipment.type_custom}
                    onChange={(e) => setNewEquipment({...newEquipment, type_custom: e.target.value})}
                    className="w-full p-2 rounded border mt-2"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Code Engin *</label>
                <input
                  type="text"
                  placeholder="ex: CAT-001"
                  value={newEquipment.name}
                  onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Modèle *</label>
                <input
                  type="text"
                  placeholder="ex: Caterpillar 390F"
                  value={newEquipment.model}
                  onChange={(e) => setNewEquipment({...newEquipment, model: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Numéro de série</label>
                <input
                  type="text"
                  placeholder="ex: SN-2024-001"
                  value={newEquipment.serial_number}
                  onChange={(e) => setNewEquipment({...newEquipment, serial_number: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Localisation</label>
                <input
                  type="text"
                  placeholder="ex: Carrière Nord"
                  value={newEquipment.location}
                  onChange={(e) => setNewEquipment({...newEquipment, location: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Statut</label>
                <select
                  value={newEquipment.status}
                  onChange={(e) => setNewEquipment({...newEquipment, status: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                >
                  <option value="active">Actif</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Hors service</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowAddModal(false); setNewEquipment({ name: '', type: '', type_custom: '', model: '', serial_number: '', location: '', status: 'active' }); }}>
                  Annuler
                </Button>
                <Button variant="default" onClick={handleAddEquipment}>
                  Ajouter l'équipement
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier Équipement */}
      {showEditModal && editEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-sm" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
              Modifier — {editEquipment.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Statut</label>
                <select
                  value={editEquipment.status}
                  onChange={(e) => setEditEquipment({ ...editEquipment, status: e.target.value })}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                >
                  <option value="active">Actif</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Hors service</option>
                  <option value="retired">Retraité</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Annuler</Button>
                <Button variant="default" onClick={handleEditStatus}>Enregistrer</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-sm" style={{ background: "var(--color-card)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(229,62,62,0.12)" }}>
                <Icon name="AlertTriangle" size={20} color="var(--color-error)" />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>Supprimer l'équipement ?</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                  Cette action est irréversible. Si des données sont liées, l'équipement sera passé en statut "Retraité".
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
              <Button variant="destructive" onClick={handleDeleteEquipment}>
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
