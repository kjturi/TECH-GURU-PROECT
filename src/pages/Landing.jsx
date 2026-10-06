import { Link, useNavigate } from 'react-router-dom'
import bspLogo from '../assets/bsp-logo.jpg'
import bspBanner from '../assets/bsp-banner.jpg'
import { useAuth } from '../contexts/AuthContext.jsx'
import { HOME_BY_ROLE } from '../components/ProtectedRoute.jsx'

// Layout and imagery ported from GDPCapstone/index.php (split hero with the
// BSP banner, feature list) — copy is rewritten to describe this app rather
// than reusing the PHP version's text.
const FEATURES = [
  { n: '01', title: 'Submit & Track Requests', body: 'Requesters submit asset requests and follow them through every stage to collection.' },
  { n: '02', title: 'Level 1 / Level 2 Approvals', body: 'Requests route to the specific named manager at each approval stage.' },
  { n: '03', title: 'Role-Based Access', body: 'Admin and requester accounts, with granular admin permissions.' },
]

export default function Landing() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const dashboardHref = profile ? HOME_BY_ROLE[profile.role] || '/login' : '/login'

  return (
    <div className="landing">
      <nav className="landing-navbar">
        <Link className="landing-brand" to="/">
          <img src={bspLogo} alt="BSP" />
          Asset Request Manager
        </Link>
        <Link className="landing-nav-cta" to={user ? dashboardHref : '/login'}>
          {user ? 'Dashboard' : 'Login'}
        </Link>
      </nav>

      <main className="landing-split">
        <section className="landing-split-image" style={{ backgroundImage: `url(${bspBanner})` }} aria-label="Office building">
          <div className="landing-caption">
            <h2>Asset Request Management</h2>
            <p>From request to approval to collection, tracked in one place.</p>
          </div>
        </section>

        <section className="landing-split-content">
          <div className="landing-content-inner">
            <img className="landing-logo" src={bspLogo} alt="BSP Logo" />
            <h1>Asset Request Manager</h1>
            <p className="landing-lead">
              Submit asset and IT service requests, route them through Level 1 and Level 2 approval,
              and track every step through to collection.
            </p>

            {user ? (
              <>
                <Link className="landing-cta" to={dashboardHref}>Go to Dashboard</Link>
                <p className="landing-signed-in">
                  Signed in as <strong>{profile?.name || user.email}</strong>
                  {profile?.role ? ` (${profile.role})` : ''} &middot;{' '}
                  <button type="button" className="landing-logout-link" onClick={handleLogout}>Logout</button>
                </p>
              </>
            ) : (
              <Link className="landing-cta" to="/login">Login</Link>
            )}

            <ul className="landing-features">
              {FEATURES.map((f) => (
                <li key={f.n}>
                  <span className="landing-feature-icon">{f.n}</span>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="landing-footer">&copy; {new Date().getFullYear()} Asset Request Manager</footer>
    </div>
  )
}
