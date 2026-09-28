import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// First page a requester lands on after signing in — deliberately just a
// greeting and one way forward.
export default function Welcome() {
  const { profile, user } = useAuth()
  const firstName = profile?.firstName || (profile?.name || '').trim().split(/\s+/)[0] || user?.email

  return (
    <section className="welcome">
      <h1>{greeting()}, {firstName}.</h1>
      <p>Request IT equipment, follow your requests, and see the assets issued to you.</p>
      <Link className="btn btn-primary btn-lg" to="/requester/requests">Continue →</Link>
    </section>
  )
}
