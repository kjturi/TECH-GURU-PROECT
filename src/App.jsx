import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Assets from './pages/Assets.jsx'
import Categories from './pages/Categories.jsx'
import Suppliers from './pages/Suppliers.jsx'
import Reports from './pages/Reports.jsx'
import { useAssets } from './hooks/useAssets.js'

export default function App() {
  // Single shared subscription so every page reflects the same live data.
  const assetsState = useAssets()

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard {...assetsState} />} />
        <Route path="/assets" element={<Assets {...assetsState} />} />
        <Route path="/categories" element={<Categories {...assetsState} />} />
        <Route path="/suppliers" element={<Suppliers {...assetsState} />} />
        <Route path="/reports" element={<Reports {...assetsState} />} />
      </Route>
    </Routes>
  )
}
