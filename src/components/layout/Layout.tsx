import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { useNotifications } from '../../context/NotificationContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { notifications, markRead, markAllRead } = useNotifications();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar
          pathname={location.pathname}
          notifications={notifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
        <main className="content-main-area">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
