export default function DataState({ loading, error, empty, onSeed, children }) {
  if (loading) {
    return <p className="state-msg">Loading assets…</p>
  }

  if (error) {
    return (
      <div className="state-msg error">
        <p>Could not connect to Firebase: {error}</p>
        <p>
          Copy <code>.env.example</code> to <code>.env</code>, fill in your Firebase
          project's config, and restart the dev server.
        </p>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="state-msg">
        <p>No assets yet.</p>
        {onSeed && (
          <p style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={onSeed}>
              Seed sample data
            </button>
          </p>
        )}
      </div>
    )
  }

  return children
}
