// components/JoinForm.tsx
import { useState } from 'react';
import { Phone } from 'lucide-react';

interface JoinFormProps {
  onJoin: (name: string) => void;
}

const JoinForm = ({ onJoin }: JoinFormProps) => {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <Phone className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Voice Call</h2>
          <p className="text-gray-600">Enter your name to join the conversation</p>
        </div>
        
        <div>
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter your name"
            />
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            Join Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinForm;