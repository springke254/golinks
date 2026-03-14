import React, { useState, useEffect } from 'react';
import { Search, X, Tag, Filter } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useUserTags } from '../../hooks/useLinks';

export default function LinkFilters({ filters, onChange }) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [showTagFilter, setShowTagFilter] = useState(false);
  const { data: userTags } = useUserTags();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (filters.search || '')) {
        onChange({ ...filters, search: localSearch || undefined });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClearSearch = () => {
    setLocalSearch('');
    onChange({ ...filters, search: undefined });
  };

  const handleTagToggle = (tagName) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName];
    onChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search links..."
            className={cn(
              'w-full bg-dark-elevated text-text-primary placeholder-text-muted',
              'border-2 border-border-strong rounded-none',
              'pl-10 pr-9 py-2 text-sm',
              'focus:outline-none focus:border-primary transition-colors'
            )}
          />
          {localSearch && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tag filter toggle */}
        {userTags && userTags.length > 0 && (
          <button
            onClick={() => setShowTagFilter(!showTagFilter)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 border-2 border-border-strong text-sm font-bold transition-colors',
              showTagFilter || filters.tags?.length
                ? 'bg-primary/10 border-primary/50 text-primary'
                : 'bg-dark-elevated text-text-muted hover:text-text-primary'
            )}
          >
            <Tag className="w-4 h-4" />
            Tags
            {filters.tags?.length > 0 && (
              <span className="w-5 h-5 flex items-center justify-center bg-primary text-text-inverse text-xs font-bold">
                {filters.tags.length}
              </span>
            )}
          </button>
        )}

        {/* Active/All filter */}
        <div className="flex items-center border-2 border-border-strong">
          {['all', 'active', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() =>
                onChange({
                  ...filters,
                  isActive:
                    status === 'all'
                      ? undefined
                      : status === 'active'
                      ? true
                      : false,
                })
              }
              className={cn(
                'px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                (filters.isActive === undefined && status === 'all') ||
                  (filters.isActive === true && status === 'active') ||
                  (filters.isActive === false && status === 'inactive')
                  ? 'bg-primary text-text-inverse'
                  : 'bg-dark-elevated text-text-muted hover:text-text-primary'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tag chips row */}
      {showTagFilter && userTags && userTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-dark-elevated/50 border-2 border-border-strong">
          <Filter className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          {userTags.map((tag) => {
            const isSelected = filters.tags?.includes(tag.name);
            return (
              <button
                key={tag.id || tag.name}
                onClick={() => handleTagToggle(tag.name)}
                className={cn(
                  'px-2 py-0.5 text-xs font-bold border transition-colors',
                  isSelected
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'bg-dark-elevated text-text-muted border-border-strong hover:text-text-primary hover:border-primary/30'
                )}
              >
                {tag.name}
              </button>
            );
          })}
          {filters.tags?.length > 0 && (
            <button
              onClick={() => onChange({ ...filters, tags: undefined })}
              className="text-xs text-text-muted hover:text-danger transition-colors ml-auto"
            >
              Clear tags
            </button>
          )}
        </div>
      )}
    </div>
  );
}
