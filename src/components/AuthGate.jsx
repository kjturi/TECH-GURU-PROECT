import { useIsApprover } from '../hooks/useIsApprover.js'

/**
 * Gates children behind Google Sign-In (the "Google SSO Verification" step).
 * Auth state is passed in as props (from the page's own useAuth() call)
 * rather than fetched here, so the page can also gate its Firestore
 * subscriptions on `user` and never attempt a protected read while signed
 * out — see useAssetRequests's `enabled` param.
 */
export default function AuthGate({ user, authLoading, authError, signIn, signOut, children }) {
  const isApprover = useIsApprover(user?.email)

  if (authLoading) {
    return <p className="state-msg">Checking sign-in status…</p>
  }

  if (!user) {
    return (
      <div className="panel" style={{ textAlign: 'center' }}>
        <h2>Sign in required</h2>
        <p style={{ marginBottom: 16, color: '#6b7280' }}>
          Approving or rejecting an asset request requires signing in with your
          Google account so we can verify you're an authorized approver.
        </p>
        <button className="btn btn-primary" onClick={signIn}>
          Sign in with Google
        </button>
        {authError && <p className="state-msg error" style={{ marginTop: 12 }}>{authError}</p>}
      </div>
    )
  }

  return (
    <>
      <div className="topbar" style={{ marginBottom: 12 }}>
        <span className="badge">
          Signed in as {user.email}
          {isApprover === false && ' (not an approver)'}
        </span>
        <button className="btn btn-danger" onClick={signOut}>Sign out</button>
      </div>
      {children({ user, isApprover, signOut })}
    </>
  )
}
