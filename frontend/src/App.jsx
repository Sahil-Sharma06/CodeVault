import { Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Snippets from './pages/Snippets.jsx';
import SnippetEdit from './pages/SnippetEdit.jsx';
import AuthCallback from './pages/AuthCallback.jsx';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Update authentication state when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    };
    
    // Check on mount
    checkAuth();
    
    // Listen for storage changes (useful for multiple tabs)
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="p-4 text-white bg-blue-600">
        <nav className="container flex items-center justify-between mx-auto">
          <Link to="/" className="text-xl font-bold">CodeVault</Link>
          <div className="flex gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/snippets" className="hover:underline">Snippets</Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 bg-red-500 rounded hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:underline">Login</Link>
                <Link to="/register" className="hover:underline">Register</Link>
                <a
                  href="/api/users/github"
                  className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-900"
                >
                  GitHub Login
                </a>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="container p-4 mx-auto">
        <Routes>
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/register" element={<Register setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/snippets" element={<Snippets isAuthenticated={isAuthenticated} />} />
          <Route path="/snippet/new" element={<SnippetEdit isAuthenticated={isAuthenticated} />} />
          <Route path="/snippet/:id" element={<SnippetEdit isAuthenticated={isAuthenticated} />} />
          <Route path="/auth/callback" element={<AuthCallback setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/" element={<Snippets isAuthenticated={isAuthenticated} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;