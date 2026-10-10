import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import FloatingRefreshButton from './FloatingRefreshButton';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <main className="content-main-area">{children}</main>
      </div>
      <FloatingRefreshButton />
      <BottomNav />
    </div>
  );
}
