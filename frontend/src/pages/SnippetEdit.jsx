import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { TagsInput } from 'react-tag-input-component';
import api from '../services/api';

function SnippetEdit({ isAuthenticated }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    code: '',
    language: '',
    tags: [],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { error: 'Please log in to edit snippets' } });
      return;
    }

    // If editing existing snippet, fetch it
    if (id) {
      fetchSnippet();
    }
  }, [id, isAuthenticated, navigate]);

  const fetchSnippet = async () => {
    try {
      setLoading(true);
      
      // Get all snippets and find the one we need
      // (since you don't have a GET /snippets/:id endpoint)
      const res = await api.get('/snippets');
      const snippet = res.data.find(s => s.id.toString() === id.toString());
      
      if (!snippet) {
        setError('Snippet not found');
        navigate('/snippets');
        return;
      }

      setFormData({
        title: snippet.title || '',
        description: snippet.description || '',
        code: snippet.code || '',
        language: snippet.language || '',
        tags: snippet.tags || [],
      });
    } catch (err) {
      console.error('Error fetching snippet:', err);
      setError(err.response?.data?.error || 'Failed to fetch snippet');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { state: { error: 'Session expired, please log in again' } });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.code.trim()) {
      setError('Title and code are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Prepare data for submission
      const submitData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        code: formData.code.trim(),
        language: formData.language?.trim() || null,
        tags: formData.tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag) // Ensure tags are clean
      };

      console.log('Submitting data:', submitData); // Debug log

      if (id) {
        // Update existing snippet (note: your PUT endpoint doesn't handle tags)
        await api.put(`/snippets/${id}`, {
          title: submitData.title,
          description: submitData.description,
          code: submitData.code,
          language: submitData.language
        });
        
        // Handle tags separately if needed
        // You might need to implement tag updates on your backend
        console.log('Snippet updated, tags:', submitData.tags);
      } else {
        // Create new snippet
        await api.post('/snippets', submitData);
      }
      
      navigate('/snippets');
    } catch (err) {
      console.error('Error saving snippet:', err);
      setError(err.response?.data?.error || 'Failed to save snippet');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { state: { error: 'Session expired, please log in again' } });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTagChange = (newTags) => {
    // Simple tag change - just update the form data
    setFormData({ ...formData, tags: newTags });
  };

  if (loading) {
    return (
      <div className="max-w-4xl p-6 mx-auto bg-white rounded-lg shadow-md">
        <p className="text-blue-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl p-6 mx-auto bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-bold">{id ? 'Edit Snippet' : 'Create Snippet'}</h2>
      {error && <p className="mb-4 text-red-500">{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Title *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            disabled={loading}
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Description</label>
          <textarea
            className="w-full px-3 py-2 border rounded"
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            disabled={loading}
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Language</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            placeholder="e.g., javascript, python, java"
            disabled={loading}
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Code *</label>
          <Editor
            height="300px"
            language={formData.language || 'javascript'}
            value={formData.code}
            onChange={(value) => setFormData({ ...formData, code: value || '' })}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on'
            }}
          />
        </div>
        
        <div className="mb-6">
          <label className="block mb-1 text-sm font-medium">Tags</label>
          <TagsInput
            value={formData.tags}
            onChange={handleTagChange}
            placeHolder="Enter tags and press Enter"
            className="w-full"
          />
          <p className="mt-1 text-xs text-gray-500">
            Add tags to help organize your snippets. Press Enter after typing each tag.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Saving...' : (id ? 'Update Snippet' : 'Create Snippet')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/snippets')}
            className="px-4 py-2 text-white bg-gray-500 rounded hover:bg-gray-600"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
      
      {/* Debug info - remove after testing */}
      <div className="p-2 mt-4 text-xs text-gray-600 rounded bg-gray-50">
        <strong>Debug:</strong> Tags: {JSON.stringify(formData.tags)}
      </div>
    </div>
  );
}

export default SnippetEdit;