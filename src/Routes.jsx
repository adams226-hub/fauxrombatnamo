import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';
import Login from "./pages/login";
import ProductionManagement from "./pages/production-management";
import ProductionSimple from "./pages/production-management/production-simple";
import ProductionFinal from "./pages/production-management/production-final";
import ExecutiveDashboard from "./pages/executive-dashboard";
import UserAuthentication from "./pages/user-authentication";
import EquipmentManagement from "./pages/equipment-management";
import FuelManagement from "./pages/fuel-management";
import Accounting from "./pages/accounting";
import Reports from "./pages/reports";
import Administration from "./pages/administration";
import AdminComplete from "./pages/administration/admin-complete";
import AdminWorking from "./pages/administration/admin-working";
import StockManagement from "./pages/stock-management";

// Composant pour la redirection automatique basée sur le rôle
function RoleBasedRedirect() {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Rediriger vers la page par défaut selon le rôle
  switch (user.role) {
    case 'admin':
    case 'directeur':
      return <Navigate to="/executive-dashboard" replace />;
    case 'chef_de_site':
      return <Navigate to="/equipment-management" replace />;
    case 'comptable':
    case 'equipement':
      return <Navigate to="/accounting" replace />;

    case 'supervisor':
    case 'operator':
      return <Navigate to="/production-management" replace />;
    default:
      return <Navigate to="/executive-dashboard" replace />;
  }
}

// Wrapper pour les routes protégées
function ProtectedRouteWrapper({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {children}
    </ProtectedRoute>
  );
}

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <RouterRoutes>
      {/* Page de connexion - accessible sans authentification */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Login />
      } />
      
      {/* Route racine - redirection selon le rôle */}
      <Route path="/" element={<RoleBasedRedirect />} />
      
      {/* Routes pour Admin, Directeur, Chef de Site, Comptable */}
      <Route path="/executive-dashboard" element={
        <ProtectedRouteWrapper allowedRoles={['admin', 'directeur']}>

          <ExecutiveDashboard />
        </ProtectedRouteWrapper>
      } />
      
      {/* Routes pour Production - accessible par tous les rôles connectés */}
      <Route path="/production-management" element={
        <ProtectedRouteWrapper allowedRoles={['admin', 'directeur', 'supervisor', 'operator']}>
          <ProductionManagement />
        </ProtectedRouteWrapper>
      } />
      
      {/* Route Production Simple - garantie fonctionnelle */}
      <Route path="/production-simple" element={
        <ProtectedRouteWrapper allowedRoles={['admin', 'directeur', 'supervisor', 'operator']}>
          <ProductionSimple />
        </ProtectedRouteWrapper>
      } />
      
      {/* Route Production Final - ULTRA simplifiée */}
      <Route path="/production-final" element={
        <ProtectedRouteWrapper allowedRoles={['admin', 'directeur', 'supervisor', 'operator']}>
          <ProductionFinal />
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/user-authentication" element={
        <ProtectedRouteWrapper allowedRoles={['admin']}>
          <UserAuthentication />
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/equipment-management" element={
        <ProtectedRouteWrapper allowedRoles={['admin', 'directeur', 'chef_de_site', 'equipement']}>
          <EquipmentManagement />


        </ProtectedRouteWrapper>
      } />
      
      <Route path="/fuel-management" element={
        <ProtectedRouteWrapper allowedRoles={['admin', 'directeur']}>
          <FuelManagement />
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/accounting" element={
        <ProtectedRouteWrapper allowedRoles={['admin', 'directeur', 'comptable', 'equipement']}>
          <Accounting />

        </ProtectedRouteWrapper>
      } />
      
      <Route path="/reports" element={
        <ProtectedRouteWrapper allowedRoles={['admin', 'directeur']}>
          <Reports />

        </ProtectedRouteWrapper>
      } />
      
      <Route path="/administration" element={
        <ProtectedRouteWrapper allowedRoles={['admin']}>
          <Administration />
        </ProtectedRouteWrapper>
      } />
      
      {/* Route Administration Complète - avec statistiques */}
      <Route path="/admin-complete" element={
        <ProtectedRouteWrapper allowedRoles={['admin']}>
          <AdminComplete />
        </ProtectedRouteWrapper>
      } />
      
      {/* Route Administration Working - version garantie */}
      <Route path="/admin-working" element={
        <ProtectedRouteWrapper allowedRoles={['admin']}>
          <AdminWorking />
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/stock-management" element={
        <ProtectedRouteWrapper allowedRoles={['admin', 'directeur', 'supervisor', 'operator']}>
          <StockManagement />

        </ProtectedRouteWrapper>
      } />
      
      {/* Route 404 */}
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
};

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
