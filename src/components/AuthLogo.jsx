import bspLogo from '../assets/bsp-logo.jpg'

// The logo and card layout (image on top, green top-border accent) are
// carried over from GDPCapstone/login.php — the image itself is unchanged.
export default function AuthLogo() {
  return <img className="auth-logo" src={bspLogo} alt="BSP Logo" />
}
