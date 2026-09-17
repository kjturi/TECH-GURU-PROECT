import Topbar from '../../components/Topbar.jsx'

// The spec didn't detail what belongs here, so this is a placeholder rather
// than a guess at settings that don't exist yet. Extend as real settings
// (e.g. RID prefix, low-stock threshold, department list) are needed.
export default function SystemSettings() {
  return (
    <>
      <Topbar title="System Settings" />
      <div className="panel">
        <p>No configurable settings yet. This section is a placeholder, reachable only by admins.</p>
      </div>
    </>
  )
}
