import React, { useState, useRef, useCallback } from 'react';
import { X, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Add a tag...',
  label,
  error,
  maxTags = 20,
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.name.toLowerCase().includes(input.toLowerCase()) &&
      !value.includes(s.name)
  );

  const addTag = useCallback(
    (tag) => {
      const normalized = tag.trim().toLowerCase();
      if (!normalized || value.includes(normalized) || value.length >= maxTags) return;
      onChange([...value, normalized]);
      setInput('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    },
    [value, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tag) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 bg-dark-elevated border-2 border-border-strong px-3 py-2 min-h-[42px] cursor-text transition-colors',
          'focus-within:border-primary',
          error && 'border-danger focus-within:border-danger'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <Tag className="w-4 h-4 text-text-muted flex-shrink-0" />
        <AnimatePresence>
          {value.map((tag) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1 bg-primary/20 text-primary px-2 py-0.5 text-xs font-bold border border-primary/30"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="hover:text-danger transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <div className="relative flex-1 min-w-[80px]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={value.length === 0 ? placeholder : ''}
            className="w-full bg-transparent text-text-primary text-sm outline-none placeholder-text-muted"
            disabled={value.length >= maxTags}
          />
          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && input.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-dark-card border-2 border-border-strong z-20 max-h-32 overflow-y-auto">
              {filteredSuggestions.slice(0, 8).map((s) => (
                <button
                  key={s.id || s.name}
                  type="button"
                  onMouseDown={() => addTag(s.name)}
                  className="w-full text-left px-3 py-1.5 text-sm text-text-secondary hover:bg-dark-elevated hover:text-text-primary transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {value.length >= maxTags && (
        <p className="mt-1 text-xs text-warning font-medium">Maximum {maxTags} tags reached</p>
      )}
      {error && <p className="mt-1 text-xs text-danger font-medium">{error}</p>}
    </div>
  );
}
