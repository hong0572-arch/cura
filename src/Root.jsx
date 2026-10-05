import { Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import NicePayment from './components/NicePayment.jsx'
import Success from './pages/Success.jsx'
import Fail from './pages/Fail.jsx'
import PaypalPayment from './components/PaypalPayment.jsx'

// 브라우저(main.jsx)와 사전 렌더링(entry-server.jsx)이 같은 라우트 트리를 쓴다
export default function Root({ initialSiteData }) {
  return (
    <Routes>
      <Route path="/*" element={<App initialSiteData={initialSiteData} />} />
      <Route path="/payment" element={<NicePayment />} />
      <Route path="/payment/paypal" element={<PaypalPayment />} />
      <Route path="/success" element={<Success />} />
      <Route path="/fail" element={<Fail />} />
    </Routes>
  )
}
