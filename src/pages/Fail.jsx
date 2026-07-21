import { useSearchParams, useNavigate } from 'react-router-dom';

export default function Fail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get('code');
  const message = searchParams.get('message');

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>❌ 결제가 실패했습니다.</h2>
      <p>에러 코드: {code}</p>
      <p>실패 사유: {message}</p>
      <button 
        onClick={() => navigate('/payment')}
        style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
      >
        다시 시도하기
      </button>
      <button 
        onClick={() => navigate('/')}
        style={{ padding: '10px 20px', marginTop: '20px', marginLeft: '10px', cursor: 'pointer' }}
      >
        홈으로 돌아가기
      </button>
    </div>
  );
}
