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
  const [operationLogs, setOperationLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [activeTab, setActiveTab] = useState('equipment'); // 'equipment' or 'operations'
  
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
  const [filterOpDateFrom, setFilterOpDateFrom] = useState('');
  const [filterOpDateTo, setFilterOpDateTo] = useState('');
  const [filterOpEquipment, setFilterOpEquipment] = useState('');

  // Nouveau: État pour le suivi quotidien des opérations
  const [newOperation, setNewOperation] = useState({
    date: new Date().toISOString().split('T')[0],
    equipment_id: '',
    code_agent: '',
    shift: 'jour',
    machine_type: '',
    status: 'functional',
    breakdown_time: '',
    repair_status: '',
    resume_time: '',
    counter_start: '',
    counter_end: '',
    distance: '',
    operator: ''
  });

  useEffect(() => {
    fetchEquipmentData();
    loadOperationLogs();
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

  const loadOperationLogs = async () => {
    try {
      const { data, error } = await miningService.getOperationLogs();
      if (error) throw error;
      setOperationLogs(data || []);
    } catch (error) {
      console.error("Erreur chargement journaux opérations:", error);
      setOperationLogs([]);
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

  // Nouvelle fonction pour ajouter une opération quotidienne
  const handleAddOperation = async () => {
    try {
      if (!newOperation.date) {
        toastError('Veuillez renseigner une date');
        return;
      }
      if (!newOperation.equipment_id && !newOperation.code_agent) {
        toastError('Veuillez sélectionner un équipement ou saisir un Code Engin');
        return;
      }

      let equipmentId = newOperation.equipment_id;

      // Si code_agent saisi sans sélection dropdown → créer ou retrouver l'équipement
      if (!equipmentId && newOperation.code_agent) {
        const existing = equipment.find(e => e.name.toLowerCase() === newOperation.code_agent.toLowerCase());
        if (existing) {
          equipmentId = existing.id;
        } else {
          const { data: created, error: createErr } = await miningService.createEquipment({
            name: newOperation.code_agent,
            type: newOperation.machine_type || 'Autre',
            model: '-',
            serial_number: `EQ-${Date.now()}`,
            status: 'active',
            purchase_date: new Date().toISOString().split('T')[0],
          });
          if (createErr) throw createErr;
          equipmentId = created.id;
          await fetchEquipmentData();
        }
      }

      const selectedEquipment = equipment.find(e => e.id === equipmentId);

      const operationToAdd = {
        date: newOperation.date,
        equipment_id: equipmentId,
        shift: newOperation.shift,
        machine_type: newOperation.machine_type || selectedEquipment?.type || '',
        status: 'functional',
        counter_start: parseFloat(newOperation.counter_start) || 0,
        counter_end: parseFloat(newOperation.counter_end) || 0,
        distance: parseFloat(newOperation.distance) || 0,
        operator_name: newOperation.operator || null,
        created_by: user?.id || null
      };

      const { error } = await miningService.addOperationLog(operationToAdd);
      if (error) throw error;

      await loadOperationLogs();
      await fetchEquipmentData();
      setShowOperationModal(false);
      setNewOperation({
        date: new Date().toISOString().split('T')[0],
        equipment_id: '',
        code_agent: '',
        shift: 'jour',
        machine_type: '',
        status: 'functional',
        breakdown_time: '',
        repair_status: '',
        resume_time: '',
        counter_start: '',
        counter_end: '',
        distance: '',
        operator: ''
      });
      
      toastSuccess('Opération enregistrée avec succès!');
    } catch (error) {
      console.error("Erreur ajout opération:", error);
      toastError(`Erreur lors de l'enregistrement: ${error.message || 'Vérifiez vos permissions'}`);
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

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.replace(':', 'h');
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

  const filteredOperationLogs = operationLogs.filter(log => {
    if (filterOpDateFrom && log.date < filterOpDateFrom) return false;
    if (filterOpDateTo && log.date > filterOpDateTo) return false;
    if (filterOpEquipment) {
      const s = filterOpEquipment.toLowerCase();
      if (!log.equipment?.name?.toLowerCase().includes(s)) return false;
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
         {/*
<Button
            variant="outline"
            iconName="Clipboard"
            iconPosition="left"
            onClick={() => setShowOperationModal(true)}
          >
            Saisie Quotidienne
          </Button>
            */
         }
          
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
          onClick={() => setActiveTab('equipment')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'equipment' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Icon name="Truck" size={16} className="inline mr-2" />
          Parc Équipements
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'operations' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Icon name="Calendar" size={16} className="inline mr-2" />
          Suivi Quotidien
        </button>
      </div>

      {activeTab === 'equipment' ? (
        <>
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
        </>
      ) : (
        <>
          {/* Vue des opérations quotidiennes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,161,105,0.12)" }}>
                  <Icon name="Clipboard" size={20} color="var(--color-success)" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Total Saisies</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>{operationLogs.length}</p>
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
                    {operationLogs.filter(o => o.status === 'functional').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(229,62,62,0.12)" }}>
                  <Icon name="AlertTriangle" size={20} color="var(--color-error)" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Pannes</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                    {operationLogs.filter(o => o.status === 'panne').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
                  <Icon name="Route" size={20} color="#3b82f6" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Distance Totale</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                    {operationLogs.reduce((sum, o) => sum + o.distance, 0).toFixed(1)} km
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtres suivi quotidien */}
          <div className="rounded-xl border p-4 mb-4" style={{ background: "var(--color-card)" }}>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-2">
                <Icon name="Filter" size={16} color="var(--color-muted-foreground)" />
                <span className="text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Filtres</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Du</label>
                <input type="date" value={filterOpDateFrom} onChange={e => setFilterOpDateFrom(e.target.value)}
                  className="p-2 rounded border text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Au</label>
                <input type="date" value={filterOpDateTo} onChange={e => setFilterOpDateTo(e.target.value)}
                  className="p-2 rounded border text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
              </div>
              <div className="flex flex-col gap-1 flex-1" style={{ minWidth: '180px' }}>
                <label className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Équipement</label>
                <input type="text" value={filterOpEquipment} onChange={e => setFilterOpEquipment(e.target.value)}
                  placeholder="Code engin..."
                  className="p-2 rounded border text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
              </div>
              <button onClick={() => { setFilterOpDateFrom(''); setFilterOpDateTo(''); setFilterOpEquipment(''); }}
                className="px-3 py-2 rounded border text-sm transition-colors hover:bg-muted"
                style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}>
                Réinitialiser
              </button>
              <span className="text-xs self-end pb-2" style={{ color: "var(--color-muted-foreground)" }}>
                {filteredOperationLogs.length} opération{filteredOperationLogs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Tableau des opérations quotidiennes */}
          <div className="rounded-xl border" style={{ background: "var(--color-card)" }}>
            <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
                Historique des Opérations Quotidiennes
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Date</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Poste</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Équipement</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Type Machine</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>État</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Heure Panne</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Réparation</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Reprise</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Compteur Début</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Compteur Fin</th>
                    <th className="text-left p-3 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperationLogs.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                        Aucune opération enregistrée
                      </td>
                    </tr>
                  ) : (
                    filteredOperationLogs.map((log) => (
                      <tr key={log.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                        <td className="p-3 text-sm" style={{ color: "var(--color-foreground)" }}>{log.date}</td>
                        <td className="p-3 text-sm" style={{ color: "var(--color-foreground)" }}>
                          <span className={`px-2 py-0.5 rounded text-xs ${log.shift === 'jour' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                            {log.shift === 'jour' ? 'Jour' : 'Nuit'}
                          </span>
                        </td>
                        <td className="p-3 text-sm" style={{ color: "var(--color-foreground)" }}>{log.equipment?.name || '—'}</td>
                        <td className="p-3 text-sm" style={{ color: "var(--color-foreground)" }}>{log.machine_type}</td>
                        <td className="p-3 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium" 
                            style={{ 
                              background: `${getStatusColor(log.status)}15`,
                              color: getStatusColor(log.status)
                            }}>
                            {getStatusText(log.status)}
                          </span>
                        </td>
                        <td className="p-3 text-sm" style={{ color: "var(--color-foreground)" }}>{formatTime(log.breakdown_time)}</td>
                        <td className="p-3 text-sm">
                          {log.repair_status ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium" 
                              style={{ 
                                background: `${getStatusColor(log.repair_status)}15`,
                                color: getStatusColor(log.repair_status)
                              }}>
                              {getStatusText(log.repair_status)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-sm" style={{ color: "var(--color-foreground)" }}>{formatTime(log.resume_time)}</td>
                        <td className="p-3 text-sm" style={{ color: "var(--color-foreground)" }}>{log.counter_start.toLocaleString()}</td>
                        <td className="p-3 text-sm" style={{ color: "var(--color-foreground)" }}>{log.counter_end.toLocaleString()}</td>
                        <td className="p-3 text-sm" style={{ color: "var(--color-foreground)" }}>{log.distance} km</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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

      {/* Modal Saisie Quotidienne */}
      {showOperationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
              Saisie Quotidienne des Équipements
            </h3>
            <div className="space-y-4">
              {/* Date et Poste */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newOperation.date}
                    onChange={(e) => setNewOperation({...newOperation, date: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Poste *
                  </label>
                  <select
                    value={newOperation.shift}
                    onChange={(e) => setNewOperation({...newOperation, shift: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  >
                    <option value="jour">Jour</option>
                    <option value="nuit">Nuit</option>
                  </select>
                </div>
              </div>

              {/* Code Engin + Type machine */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Code Engin *
                  </label>
                  <input
                    list="equipment-list"
                    type="text"
                    value={newOperation.code_agent || (equipment.find(e => e.id === newOperation.equipment_id)?.name || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = equipment.find(eq => eq.name.toLowerCase() === val.toLowerCase());
                      setNewOperation({
                        ...newOperation,
                        code_agent: val,
                        equipment_id: matched ? matched.id : '',
                        machine_type: matched ? (matched.type || newOperation.machine_type || '') : newOperation.machine_type
                      });
                    }}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    placeholder="Ex: CAM-001"
                  />
                  <datalist id="equipment-list">
                    {equipment.map(eq => (
                      <option key={eq.id} value={eq.name} />
                    ))}
                  </datalist>
                  {newOperation.code_agent && !newOperation.equipment_id && (
                    <p className="text-xs mt-1" style={{ color: "var(--color-warning)" }}>
                      Nouvel équipement — sera créé automatiquement
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Type de machine
                  </label>
                  <select
                    value={newOperation.machine_type}
                    onChange={(e) => setNewOperation({...newOperation, machine_type: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  >
                    <option value="">Sélectionner un type...</option>
                    {EQUIPMENT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opérateur */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Opérateur
                </label>
                <input
                  type="text"
                  value={newOperation.operator}
                  onChange={(e) => setNewOperation({...newOperation, operator: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  placeholder="Nom de l'opérateur"
                />
              </div>

              {/* Compteurs et Distance */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Compteur Début
                  </label>
                  <input
                    type="number"
                    value={newOperation.counter_start}
                    onChange={(e) => setNewOperation({...newOperation, counter_start: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Compteur Fin
                  </label>
                  <input
                    type="number"
                    value={newOperation.counter_end}
                    onChange={(e) => {
                      const end = parseFloat(e.target.value) || 0;
                      const start = parseFloat(newOperation.counter_start) || 0;
                      setNewOperation({
                        ...newOperation,
                        counter_end: e.target.value,
                        distance: Math.max(0, end - start).toFixed(1)
                      });
                    }}
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Distance parcourue (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newOperation.distance}
                    readOnly
                    className="w-full p-2 rounded border"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-muted)", color: "var(--color-foreground)", cursor: 'not-allowed' }}
                    placeholder="Auto-calculé"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowOperationModal(false)}>
                  Annuler
                </Button>
                <Button variant="default" onClick={handleAddOperation}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
