import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Start', end: true },
  { to: '/speakers', label: 'Lautsprecher' },
  { to: '/measure', label: 'Messen' },
  { to: '/protocol', label: 'Protokoll' },
  { to: '/export', label: 'Export' },
  { to: '/settings', label: 'Einst.' },
];

export function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Speeky-Tester</h1>
        <p>Lautsprecher-Messung (externer Testton)</p>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
