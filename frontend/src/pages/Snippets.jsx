import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import SnippetCard from '../components/SnippetCard.jsx';

function Snippets({ isAuthenticated }) {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({ query: '', language: '', tags: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchSnippets = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters for search
      const params = {};
      if (search.query.trim()) params.query = search.query.trim();
      if (search.language.trim()) params.language = search.language.trim();
      if (search.tags.trim()) params.tags = search.tags.trim();
      
      console.log('Fetching snippets with params:', params); // Debug log
      console.log('Token exists:', !!localStorage.getItem('token')); // Debug log
      
      // Try the search endpoint first, fall back to main endpoint
      const endpoint = (search.query || search.language || search.tags) 
        ? '/snippets/search' 
        : '/snippets';
      
      const res = await api.get(endpoint, { params });
      console.log('Snippets response:', res.data); // Debug log
      console.log('Response status:', res.status); // Debug log
      
      // Debug: Check the structure of the first snippet
      if (res.data && res.data.length > 0) {
        console.log('First snippet structure:', res.data[0]);
        console.log('First snippet tags:', res.data[0].tags);
        console.log('Tags type:', typeof res.data[0].tags);
        console.log('Tags array?', Array.isArray(res.data[0].tags));
        console.log('Tags length:', res.data[0].tags?.length);
      }
      
      setSnippets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching snippets:', err); // Debug log
      console.error('Error response:', err.response); // Debug log
      
      setError(err.response?.data?.error || err.message || 'Failed to fetch snippets');
      
      if (err.response?.status === 401) {
        navigate('/login', { state: { error: 'Session expired, please log in again' } });
      }
    } finally {
      setLoading(false);
    }
  };

  // Check authentication and fetch snippets
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { error: 'Please log in to view snippets' } });
    } else {
      fetchSnippets();
    }
  }, [isAuthenticated, navigate]);

  const handleSearch = () => {
    if (isAuthenticated) {
      fetchSnippets();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this snippet?')) {
      try {
        await api.delete(`/snippets/${id}`);
        setSnippets(snippets.filter((s) => s.id !== id));
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete snippet');
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login', { state: { error: 'Session expired, please log in again' } });
        }
      }
    }
  };

  // Function to refresh snippets (can be called after creating/updating)
  const refreshSnippets = () => {
    fetchSnippets();
  };

  // Update snippet in state when tags are added via SnippetCard
  const handleSnippetUpdate = (updatedSnippet) => {
    setSnippets(prevSnippets => 
      prevSnippets.map(snippet => 
        snippet.id === updatedSnippet.id ? updatedSnippet : snippet
      )
    );
  };

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Your Snippets</h2>
      <Link
        to="/snippet/new"
        className="inline-block px-4 py-2 mb-4 text-white bg-blue-500 rounded hover:bg-blue-600"
      >
        Create Snippet
      </Link>
      
      <div className="flex flex-col gap-4 mb-4 sm:flex-row">
        <input
          type="text"
          placeholder="Search by title or code"
          className="flex-1 px-3 py-2 border rounded"
          value={search.query}
          onChange={(e) => setSearch({ ...search, query: e.target.value })}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <input
          type="text"
          placeholder="Language (e.g., javascript)"
          className="flex-1 px-3 py-2 border rounded"
          value={search.language}
          onChange={(e) => setSearch({ ...search, language: e.target.value })}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <input
          type="text"
          placeholder="Tags (comma-separated)"
          className="flex-1 px-3 py-2 border rounded"
          value={search.tags}
          onChange={(e) => setSearch({ ...search, tags: e.target.value })}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {error && <p className="mb-4 text-red-500">{error}</p>}
      
      {loading && <p className="mb-4 text-blue-500">Loading snippets...</p>}
      
      {!loading && snippets.length === 0 ? (
        <p className="text-gray-500">No snippets found. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {snippets.map((snippet) => (
            <SnippetCard key={snippet.id} snippet={snippet} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Snippets;