import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function AuthCallback({ setIsAuthenticated }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      navigate('/snippets');
    } else {
      navigate('/login', { state: { error: error || 'GitHub login failed' } });
    }
  }, [searchParams, navigate, setIsAuthenticated]);

  return (
    <div className="text-center p-4">
      <p>Processing GitHub login...</p>
    </div>
  );
}

export default AuthCallback;
