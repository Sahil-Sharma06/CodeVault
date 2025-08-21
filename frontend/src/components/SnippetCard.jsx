import { Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../services/api'; // Adjust the import path as needed

function SnippetCard({ snippet, onDelete, onUpdate }) {
  const [tags, setTags] = useState(snippet.tags || []);
  const [newTag, setNewTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    setAddingTag(true);
    try {
      const response = await api.post(`/snippets/${snippet.id}/tags`, {
        tags: [newTag.trim()]
      });
      
      // Update local tags state
      const updatedTags = response.data.tags || [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      
      // Notify parent component about the update
      if (onUpdate) {
        onUpdate({ ...snippet, tags: updatedTags });
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert('Failed to add tag');
    } finally {
      setAddingTag(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="mb-2 text-lg font-semibold">{snippet.title}</h3>
      <p className="mb-2 text-sm text-gray-500">{snippet.language || 'No language'}</p>
      <p className="mb-2 text-sm text-gray-600 truncate">{snippet.description || 'No description'}</p>
      
      <pre className="p-2 mb-2 overflow-auto text-sm bg-gray-100 rounded max-h-40">
        {snippet.code.slice(0, 200)}
        {snippet.code.length > 200 ? '...' : ''}
      </pre>
      
      {/* Enhanced tag display */}
      <div className="mb-2">
        <span className="block mb-1 text-sm text-gray-500">Tags:</span>
        <div className="flex flex-wrap gap-1 mb-2">
          {tags && Array.isArray(tags) && tags.length > 0 ? (
            tags.map((tag, index) => (
              <span key={index} className="inline-block px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full">
                {tag}
              </span>
            ))
          ) : (
            <span className="text-sm italic text-gray-400">No tags</span>
          )}
        </div>
        
        {/* Quick add tag functionality */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag..."
            className="flex-1 px-2 py-1 text-xs border rounded"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            disabled={addingTag}
          />
          <button
            onClick={handleAddTag}
            disabled={addingTag || !newTag.trim()}
            className="px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {addingTag ? '...' : 'Add'}
          </button>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Link
          to={`/snippet/${snippet.id}`}
          className="px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600"
        >
          Edit
        </Link>
        <button
          onClick={() => onDelete(snippet.id)}
          className="px-3 py-1 text-white bg-red-500 rounded hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default SnippetCard;