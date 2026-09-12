import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { MainLayout } from './layouts/MainLayout'
import { Dashboard } from './pages/Dashboard'
import { Documents } from './pages/Documents'
import { Search } from './pages/Search'
import { Assistant } from './pages/Assistant'
import { KnowledgeBase } from './pages/KnowledgeBase'
import { Settings } from './pages/Settings'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="documents" element={<Documents />} />
            <Route path="search" element={<Search />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="knowledge-base" element={<KnowledgeBase />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
