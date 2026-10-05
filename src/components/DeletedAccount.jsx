import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

// Shown instead of the app to a signed-in account an admin has deleted
// (users/{uid}.status == 'deleted'). firestore.rules already denies such
// an account everything; this just says so plainly and offers a way out.
export default function DeletedAccount() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="deleted-account">
      <h1>This account has been deleted</h1>
      <p>An administrator has removed this account from BSP IT Assets. If you think this is a mistake, contact IT.</p>
      <button className="btn btn-secondary" onClick={handleLogout}>Log out</button>
    </div>
  )
}
