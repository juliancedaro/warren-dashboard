import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './dashboard/components/AppLayout'
import { DashboardDataProvider } from './dashboard/DashboardDataContext'
import Dashboard from './dashboard/Dashboard'
import { HeatmapPage } from './dashboard/HeatmapPage'

export default function App() {
  return (
    <BrowserRouter>
      <DashboardDataProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/heatmap" element={<HeatmapPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardDataProvider>
    </BrowserRouter>
  )
}
