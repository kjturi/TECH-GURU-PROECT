import Assets from '../Assets.jsx'
import { useAssets } from '../../hooks/useAssets.js'

// Reuses the existing Assets catalog page as-is, just gated to admin-only
// now via the /admin/inventory route instead of being open to everyone.
export default function StockInventory() {
  const assetsState = useAssets()
  return <Assets {...assetsState} />
}
