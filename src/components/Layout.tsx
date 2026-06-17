import { NavLink, Outlet } from 'react-router-dom';
import { useT } from '../i18n';

const navItems = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/speakers', key: 'nav.speakers' },
  { to: '/measure', key: 'nav.measure' },
  { to: '/protocol', key: 'nav.protocol' },
  { to: '/settings', key: 'nav.settings' },
];

export function Layout() {
  const { t } = useT();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>
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
            {t(item.key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
