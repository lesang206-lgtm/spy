import { useState, KeyboardEvent } from 'react';

interface SearchBoxProps {
  onSearch: (q: string) => void;
  loading: boolean;
}

export function SearchBox({ onSearch, loading }: SearchBoxProps) {
  const [query, setQuery] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      onSearch(query);
    }
  };

  const handleClick = () => {
    if (!loading) {
      onSearch(query);
    }
  };

  return (
    <div className="search-box">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tên thuốc cần so sánh..."
        autoFocus
        disabled={loading}
      />
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'Đang tìm...' : 'So Sánh'}
      </button>
    </div>
  );
}
