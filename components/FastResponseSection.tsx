
import React, { useState } from 'react';
import { Button } from './Button';
import { getFastResponse } from '../services/geminiService';

export const FastResponseSection: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const response = await getFastResponse(prompt);
      setResult(response);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 glass rounded-2xl">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-yellow-400">Bolt</span> Quick Response
      </h2>
      <div className="flex gap-2 mb-4">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a quick query (e.g., 'What is gravity?')"
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
        />
        <Button onClick={handleQuery} isLoading={loading} variant="primary" className="bg-yellow-600 hover:bg-yellow-700">
          Query
        </Button>
      </div>
      {result && (
        <div className="bg-black/20 border border-white/5 rounded-xl p-4 text-sm text-zinc-300">
          {result}
        </div>
      )}
    </div>
  );
};
