import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { miningService } from "../../config/supabase";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import KPICard from "./components/KPICard";
import ProductionChart from "./components/ProductionChart";
import FuelCostChart from "./components/FuelCostChart";
import ProfitabilityChart from "./components/ProfitabilityChart";
import AlertsPanel from "./components/AlertsPanel";
import FinancialSummary from "./components/FinancialSummary";
import SiteStatusTable from "./components/SiteStatusTable";
import ExportPanel from "./components/ExportPanel";

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kpiData, setKpiData] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { data, error } = await miningService.getDashboardStats();
      if (error) { console.error('Erreur dashboard:', error); return; }
      if (!data) return;

      setDashboardData(data);

      const availability = Number(data.equipment_availability || 0);
      setKpiData([
        {
          id: 1,
          title: "Production du Jour",
          value: Number(data.total_production || 0).toLocaleString('fr-FR'),
          unit: "t",
          trend: data.total_production > 0 ? "up" : "stable",
          trendValue: data.total_production > 0 ? "+" + Number(data.total_production).toLocaleString('fr-FR') + "t" : "0t",
          icon: "Mountain",
          iconColor: "var(--color-primary)",
          bgColor: "rgba(44,85,48,0.12)",
          subtitle: "Production aujourd'hui",
          color: "var(--color-primary)",
          progress: Math.min(100, (Number(data.total_production) / 1500) * 100),
          progressColor: "var(--color-primary)",
        },
        {
          id: 2,
          title: "Production du Mois",
          value: Number(data.total_production_month || 0).toLocaleString('fr-FR'),
          unit: "t",
          trend: "up",
          trendValue: Number(data.total_production_month || 0).toLocaleString('fr-FR') + "t",
          icon: "BarChart3",
          iconColor: "#3182CE",
          bgColor: "rgba(49,130,206,0.12)",
          subtitle: "Production cumulée ce mois",
          color: "#3182CE",
          progress: Math.min(100, (Number(data.total_production_month || 0) / 50000) * 100),
          progressColor: "#3182CE",
        },
        {
          id: 3,
          title: "Engins Actifs",
          value: `${availability.toFixed(1)} %`,
          unit: "",
          trend: availability >= 80 ? "up" : availability >= 50 ? "stable" : "down",
          trendValue: `${data.active_equipment}/${data.equipment_count}`,
          icon: "Activity",
          iconColor: "#F59E0B",
          bgColor: "rgba(245,158,11,0.12)",
          subtitle: "Taux de disponibilité",
          color: "#F59E0B",
          progress: availability,
          progressColor: "#F59E0B",
        },
      ]);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setLastRefresh(new Date());
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <AppLayout userRole={user?.role} userName={user?.full_name} userSite={user?.department || 'Amp Mines et Carrieres'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
            Tableau de Bord Direction
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}
          >
            Vue exécutive en temps réel — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs"
            style={{
              background: "var(--color-muted)",
              borderColor: "var(--color-border)",
              color: "var(--color-muted-foreground)",
              fontFamily: "var(--font-caption)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "var(--color-success)" }}
            />
            Mis à jour: {formatTime(lastRefresh)}
          </div>
          <Button
            variant="outline"
            size="sm"
            iconName="RefreshCw"
            iconPosition="left"
            loading={refreshing}
            onClick={handleRefresh}
          >
            Actualiser
          </Button>
          <Button
            variant="default"
            size="sm"
            iconName="BarChart3"
            iconPosition="left"
            onClick={() => navigate("/production-management")}
          >
            Production
          </Button>
        </div>
      </div>
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {kpiData?.map((kpi) => (
          <div key={kpi?.id} className="col-span-1">
            <KPICard
              title={kpi?.title}
              value={kpi?.value}
              unit={kpi?.unit}
              trend={kpi?.trend}
              trendValue={kpi?.trendValue}
              icon={kpi?.icon}
              iconColor={kpi?.iconColor}
              bgColor={kpi?.bgColor}
              subtitle={kpi?.subtitle}
              color={kpi?.color}
              progress={kpi?.progress}
              progressColor={kpi?.progressColor}
            />
          </div>
        ))}
      </div>
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Production chart - 2 cols */}
        <div className="lg:col-span-2">
          <ProductionChart
            weekData={dashboardData?.production_week_data || []}
            monthData={dashboardData?.production_month_data || []}
          />
        </div>
        {/* Alerts panel - 1 col */}
        <div className="lg:col-span-1">
          <AlertsPanel onNavigate={navigate} dashboardData={dashboardData} />
        </div>
      </div>
      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <FuelCostChart data={dashboardData?.fuel_chart_data || []} />
        <ProfitabilityChart data={dashboardData?.monthly_profit_data || []} />
      </div>
      {/* Financial summary + Export */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2">
          <FinancialSummary
            revenue={dashboardData?.total_revenue || 0}
            expenses={dashboardData?.total_expenses || 0}
            netProfit={dashboardData?.net_profit || 0}
              profitability={dashboardData?.profitability || 0}
          />
        </div>
        <div className="lg:col-span-1">
          <ExportPanel />
        </div>
      </div>
      {/* Site status table */}
      <div className="mb-6 md:mb-8">
        <SiteStatusTable sites={dashboardData?.sites || []} />
      </div>
      {/* Quick navigation footer */}
      <div
        className="rounded-xl border p-4 md:p-5"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Icon name="Navigation" size={16} color="var(--color-primary)" />
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}
          >
            Navigation Rapide
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Production", icon: "BarChart3", path: "/production-management", color: "var(--color-primary)" },
            { label: "Équipement", icon: "Wrench", path: "/equipment-management", color: "#3182CE" },
            { label: "Carburant", icon: "Fuel", path: "/fuel-management", color: "var(--color-warning)" },
            { label: "Comptabilité", icon: "Calculator", path: "/accounting", color: "#805AD5" },
            { label: "Rapports", icon: "FileText", path: "/reports", color: "var(--color-accent)" },
            { label: "Administration", icon: "Settings", path: "/administration", color: "var(--color-secondary)" },
          ]?.map((item) => (
            <button
              key={item?.path}
              onClick={() => navigate(item?.path)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-muted)",
              }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ background: `${item?.color}15` }}
              >
                <Icon name={item?.icon} size={18} color={item?.color} />
              </div>
              <span
                className="text-xs font-medium text-center"
                style={{ color: "var(--color-foreground)", fontFamily: "var(--font-caption)" }}
              >
                {item?.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}