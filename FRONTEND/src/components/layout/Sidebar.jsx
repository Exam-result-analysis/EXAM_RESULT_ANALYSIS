const Sidebar = ({ activePage = "Dashboard", onNavigate }) => {
  const mainMenu = [
    {
      label: "Dashboard",
      icon: "▣",
    },
    {
      label: "Department Analysis",
      icon: "▤",
    },
    {
      label: "Course Analysis",
      icon: "▥",
    },
    {
      label: "Session Analysis",
      icon: "◷",
    },
    {
      label: "Exam Mode Analysis",
      icon: "◉",
    },
    {
      label: "Reports",
      icon: "▧",
    },
  ];

  const bottomMenu = [
    {
      label: "Settings",
      icon: "⚙",
    },
    {
      label: "Log out",
      icon: "↪",
    },
  ];

  const handleNavigation = (label) => {
    if (onNavigate) {
      onNavigate(label);
    }
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-slate-100 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
            ER
          </div>

          <div>
            <h1 className="text-sm font-bold text-slate-900">
              Exam Results
            </h1>

            <p className="text-xs text-slate-500">
              Analytics Portal
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-5">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Analysis
        </p>

        <div className="space-y-1">
          {mainMenu.map((item) => {
            const active = activePage === item.label;

            return (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.label)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                  text-left text-sm font-medium transition
                  ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <span className="flex w-5 justify-center text-base">
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-slate-100 p-3">
        {bottomMenu.map((item) => (
          <button
            key={item.label}
            onClick={() => handleNavigation(item.label)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5
              text-left text-sm font-medium text-slate-600
              transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="flex w-5 justify-center">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        ))}
      </div>

    </aside>
  );
};

export default Sidebar;