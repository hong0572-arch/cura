import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import NicePayment from './components/NicePayment.jsx'
import Success from './pages/Success.jsx'
import Fail from './pages/Fail.jsx'
import PaypalPayment from './components/PaypalPayment.jsx'

// 탑승권 결제 시안 — 개발 서버에서만 열린다 (운영 빌드에서는 제외)
const BoardingPassPreview = import.meta.env.DEV ? lazy(() => import('./components/checkout/BoardingPassPreview.jsx')) : null

// 브라우저(main.jsx)와 사전 렌더링(entry-server.jsx)이 같은 라우트 트리를 쓴다
export default function Root({ initialSiteData }) {
  return (
    <Routes>
      <Route path="/*" element={<App initialSiteData={initialSiteData} />} />
      <Route path="/payment" element={<NicePayment />} />
      <Route path="/payment/paypal" element={<PaypalPayment />} />
      <Route path="/success" element={<Success />} />
      <Route path="/fail" element={<Fail />} />
      {BoardingPassPreview && (
        <Route path="/preview/boarding-pass" element={<Suspense fallback={null}><BoardingPassPreview /></Suspense>} />
      )}
    </Routes>
  )
}
