import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'
import NicePayment from './components/NicePayment.jsx'
import Success from './pages/Success.jsx'
import Fail from './pages/Fail.jsx'
import PaypalPayment from './components/PaypalPayment.jsx'
import { Analytics } from "@vercel/analytics/react"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<App />} />
          <Route path="/payment" element={<NicePayment />} />
          <Route path="/payment/paypal" element={<PaypalPayment />} />
          <Route path="/success" element={<Success />} />
          <Route path="/fail" element={<Fail />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
    <Analytics />
  </StrictMode>,
)
