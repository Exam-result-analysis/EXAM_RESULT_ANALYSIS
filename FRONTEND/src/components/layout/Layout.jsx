import Sidebar from "./Sidebar";

const Layout = ({ children, activePage, onNavigate }) => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
      />

      <main className="min-w-0 flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;