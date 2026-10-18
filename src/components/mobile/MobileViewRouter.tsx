import React from 'react';
import { ActiveNav } from '../../types';
import { useAuction } from '../../context/AuctionContext';
import { MobileDashboardView } from './MobileDashboardView';
import { MobileLiveAuctionView } from './MobileLiveAuctionView';
import { MobilePlayersView } from './MobilePlayersView';
import { MobileTeamsView } from './MobileTeamsView';
import { MobileSquadsView } from './MobileSquadsView';
import { MobileHistoryView } from './MobileHistoryView';

// These screens are low-traffic / form-heavy and the existing components are
// already single-column on narrow screens, so the mobile layout reuses them
// rather than duplicating. Only the high-traffic auction screens got a
// purpose-built mobile version.
import { AnalyticsView } from '../AnalyticsView';
import { SettingsView } from '../SettingsView';
import { PlayerRegistrationView } from '../PlayerRegistrationView';
import { AdminPanel } from '../AdminPanel';
import { AdminAccessGate } from '../admin/AdminAccessGate';

interface MobileViewRouterProps {
  activeNav: ActiveNav;
  onSelectNav: (nav: ActiveNav) => void;
  onSelectTeamForSquad: (teamId: string) => void;
  selectedSquadTeamId: string;
  defaultTeamId: string;
}

/**
 * Maps `activeNav` to a mobile-optimised view. High-traffic screens (dashboard,
 * live auction, players, teams, squads, history) have dedicated card-based
 * layouts; the rest reuse the shared components.
 */
export const MobileViewRouter: React.FC<MobileViewRouterProps> = ({
  activeNav,
  onSelectNav,
  onSelectTeamForSquad,
  selectedSquadTeamId,
  defaultTeamId,
}) => {
  const { role } = useAuction();

  switch (activeNav) {
    case 'dashboard':
      return <MobileDashboardView onNavigate={onSelectNav} onSelectTeamForSquad={onSelectTeamForSquad} />;
    case 'live-auction':
      return <MobileLiveAuctionView />;
    case 'players':
      return <MobilePlayersView />;
    case 'teams':
      return <MobileTeamsView onSelectTeamForSquad={onSelectTeamForSquad} />;
    case 'team-squads':
      return <MobileSquadsView initialTeamId={selectedSquadTeamId || defaultTeamId} />;
    case 'auction-history':
      return <MobileHistoryView />;
    case 'analytics':
      return <AnalyticsView />;
    case 'settings':
      return <SettingsView onSelectNav={onSelectNav} />;
    case 'register':
      return <PlayerRegistrationView onBackToApp={() => onSelectNav('dashboard')} />;
    case 'admin':
      return role === 'admin' ? (
        <AdminPanel onSelectNav={onSelectNav} />
      ) : (
        <AdminAccessGate
          onUnlockSuccess={() => onSelectNav('admin')}
          onReturnToDashboard={() => onSelectNav('dashboard')}
        />
      );
    default:
      return <MobileDashboardView onNavigate={onSelectNav} onSelectTeamForSquad={onSelectTeamForSquad} />;
  }
};
