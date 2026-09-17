import Topbar from '../../components/Topbar.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function Profile() {
  const { user, profile } = useAuth()

  return (
    <>
      <Topbar title="Profile" />
      <div className="panel">
        <dl className="profile-list">
          <dt>Name</dt><dd>{profile?.name}</dd>
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Employee ID</dt><dd>{profile?.employeeId}</dd>
          <dt>Department</dt><dd>{profile?.department}</dd>
          <dt>Role</dt><dd style={{ textTransform: 'capitalize' }}>{profile?.role}</dd>
        </dl>
      </div>
    </>
  )
}
