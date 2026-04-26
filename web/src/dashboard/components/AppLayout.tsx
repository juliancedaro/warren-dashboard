import { NavLink, Outlet } from 'react-router-dom'
import '../dashboard.css'

export function AppLayout() {
  return (
    <div className="dash-app">
      <aside className="dash-sidenav" aria-label="Navegación">
        <div className="dash-sidenav-top">
          <div className="dash-sidenav-brand">
            <img className="dash-sidenav-logo" src="/bursyra-logo.png" alt="" width={28} height={28} />
            <div>
              <span className="dash-sidenav-name">Bursyra</span>
              <span className="dash-sidenav-sub">Panel</span>
            </div>
          </div>
        </div>
        <nav className="dash-sidenav-nav">
          <NavLink className="dash-sidenav-link" to="/" end>
            <span className="dash-sidenav-ico" aria-hidden>
              ⊞
            </span>
            <span>Tablero</span>
          </NavLink>
          <NavLink className="dash-sidenav-link" to="/heatmap">
            <span className="dash-sidenav-ico" aria-hidden>
              ▦
            </span>
            <span>Mapa de calor</span>
          </NavLink>
        </nav>
      </aside>
      <div className="dash-app-outlet" id="app-main">
        <Outlet />
      </div>
    </div>
  )
}
