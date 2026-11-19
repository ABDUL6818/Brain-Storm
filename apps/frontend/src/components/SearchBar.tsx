import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Public props for SearchBar. Kept backwards compatible.
 */
export interface SearchBarProps {
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Initial query value. */
  initialQuery?: string;
  /** Called when the user submits a search. */
  onSearch?: (query: string) => void;
  /** Called whenever the query changes (debounced). */
  onQueryChange?: (query: string) => void;
  /** Optional data source for suggestions. */
  fetchSuggestions?: (query: string) => Promise<string[]>;
  /** Optional data source for results. */
  fetchResults?: (query: string) => Promise<SearchResult[]>;
  /** Debounce delay in milliseconds. */
  debounceMs?: number;
  /** Additional class name for the root element. */
  className?: string;
  /** Disables the input. */
  disabled?: boolean;
}

export interface SearchResult {
  id: string | number;
  title: string;
  description?: string;
  url?: string;
}

export interface UseSearchBarOptions {
  initialQuery?: string;
  debounceMs?: number;
  fetchSuggestions?: (query: string) => Promise<string[]>;
  fetchResults?: (query: string) => Promise<SearchResult[]>;
  onQueryChange?: (query: string) => void;
  onSearch?: (query: string) => void;
}

export interface UseSearchBarReturn {
  query: string;
  setQuery: (value: string) => void;
  debouncedQuery: string;
  suggestions: string[];
  results: SearchResult[];
  isLoadingSuggestions: boolean;
  isLoadingResults: boolean;
  error: Error | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  submit: (value?: string) => void;
  clear: () => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Custom hook encapsulating query state, debouncing, and data fetching.
 */
export function useSearchBar(options: UseSearchBarOptions = {}): UseSearchBarReturn {
  const {
    initialQuery = '',
    debounceMs = 300,
    fetchSuggestions,
    fetchResults,
    onQueryChange,
    onSearch,
  } = options;

  const [query, setQueryState] = useState<string>(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const onQueryChangeRef = useRef(onQueryChange);
  onQueryChangeRef.current = onQueryChange;

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setActiveIndex(-1);
  }, []);

  // Debounce the query.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [query, debounceMs]);

  // Notify query change listener.
  useEffect(() => {
    if (onQueryChangeRef.current) {
      onQueryChangeRef.current(debouncedQuery);
    }
  }, [debouncedQuery]);

  // Fetch suggestions.
  useEffect(() => {
    let cancelled = false;
    if (!fetchSuggestions || debouncedQuery.trim() === '') {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return () => {
        cancelled = true;
      };
    }
    setIsLoadingSuggestions(true);
    setError(null);
    fetchSuggestions(debouncedQuery)
      .then((data) => {
        if (!cancelled) {
          setSuggestions(Array.isArray(data) ? data : []);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSuggestions(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, fetchSuggestions]);

  // Fetch results.
  useEffect(() => {
    let cancelled = false;
    if (!fetchResults || debouncedQuery.trim() === '') {
      setResults([]);
      setIsLoadingResults(false);
      return () => {
        cancelled = true;
      };
    }
    setIsLoadingResults(true);
    setError(null);
    fetchResults(debouncedQuery)
      .then((data) => {
        if (!cancelled) {
          setResults(Array.isArray(data) ? data : []);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingResults(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, fetchResults]);

  const submit = useCallback(
    (value?: string) => {
      const finalQuery = value !== undefined ? value : query;
      setQueryState(finalQuery);
      setDebouncedQuery(finalQuery);
      setIsOpen(false);
      setActiveIndex(-1);
      if (onSearch) {
        onSearch(finalQuery);
      }
    },
    [query, onSearch],
  );

  const clear = useCallback(() => {
    setQueryState('');
    setDebouncedQuery('');
    setSuggestions([]);
    setResults([]);
    setActiveIndex(-1);
    setIsOpen(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const items = suggestions.length > 0 ? suggestions : results.map((r) => r.title);
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (items.length > 0) {
            setActiveIndex((prev) => (prev + 1) % items.length);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (items.length > 0) {
            setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          }
          break;
        case 'Enter': {
          if (activeIndex >= 0 && activeIndex < items.length) {
            event.preventDefault();
            submit(items[activeIndex]);
          } else {
            submit();
          }
          break;
        }
        case 'Escape':
          setIsOpen(false);
          setActiveIndex(-1);
          break;
        default:
          break;
      }
    },
    [suggestions, results, activeIndex, submit],
  );

  return {
    query,
    setQuery,
    debouncedQuery,
    suggestions,
    results,
    isLoadingSuggestions,
    isLoadingResults,
    error,
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
    submit,
    clear,
    handleKeyDown,
  };
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  inputId?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  onClear,
  onKeyDown,
  onFocus,
  placeholder = 'Search...',
  disabled = false,
  isLoading = false,
  inputId = 'search-input',
}) => {
  return (
    <div className="search-input" data-testid="search-input">
      <input
        id={inputId}
        type="text"
        role="searchbox"
        aria-label="Search"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className="search-input__field"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="search-input__clear"
          onClick={onClear}
          disabled={disabled}
        >
          ×
        </button>
      )}
      <button
        type="button"
        aria-label="Submit search"
        className="search-input__submit"
        onClick={onSubmit}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
};

export interface SearchSuggestionsProps {
  suggestions: string[];
  activeIndex: number;
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  visible?: boolean;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  activeIndex,
  onSelect,
  isLoading = false,
  visible = true,
}) => {
  if (!visible) {
    return null;
  }
  if (isLoading) {
    return (
      <div className="search-suggestions search-suggestions--loading" data-testid="search-suggestions-loading">
        Loading suggestions...
      </div>
    );
  }
  if (suggestions.length === 0) {
    return null;
  }
  return (
    <ul className="search-suggestions" role="listbox" data-testid="search-suggestions">
      {suggestions.map((suggestion, index) => (
        <li
          key={`${suggestion}-${index}`}
          role="option"
          aria-selected={index === activeIndex}
          className={
            index === activeIndex
              ? 'search-suggestions__item search-suggestions__item--active'
              : 'search-suggestions__item'
          }
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(suggestion);
          }}
        >
          {suggestion}
        </li>
      ))}
    </ul>
  );
};

export interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  error?: Error | null;
  emptyMessage?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading = false,
  error = null,
  emptyMessage = 'No results found',
}) => {
  if (error) {
    return (
      <div className="search-results search-results--error" role="alert" data-testid="search-results-error">
        {error.message}
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="search-results search-results--loading" data-testid="search-results-loading">
        Loading results...
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="search-results search-results--empty" data-testid="search-results-empty">
        {emptyMessage}
      </div>
    );
  }
  return (
    <ul className="search-results" data-testid="search-results">
      {results.map((result) => (
        <li key={result.id} className="search-results__item">
          {result.url ? (
            <a href={result.url} className="search-results__link">
              {result.title}
            </a>
          ) : (
            <span className="search-results__title">{result.title}</span>
          )}
          {result.description && (
            <p className="search-results__description">{result.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
};

/**
 * Thin wrapper component preserving the original public API.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder,
  initialQuery,
  onSearch,
  onQueryChange,
  fetchSuggestions,
  fetchResults,
  debounceMs,
  className,
  disabled,
}) => {
  const {
    query,
    setQuery,
    suggestions,
    results,
    isLoadingSuggestions,
    isLoadingResults,
    error,
    isOpen,
    setIsOpen,
    activeIndex,
    submit,
    clear,
    handleKeyDown,
  } = useSearchBar({
    initialQuery,
    debounceMs,
    fetchSuggestions,
    fetchResults,
    onQueryChange,
    onSearch,
  });

  const showSuggestions = useMemo(
    () => isOpen && suggestions.length > 0,
    [isOpen, suggestions.length],
  );

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      setIsOpen(true);
    },
    [setQuery, setIsOpen],
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      submit(suggestion);
    },
    [submit],
  );

  return (
    <div className={className ? `search-bar ${className}` : 'search-bar'} data-testid="search-bar">
      <SearchInput
        value={query}
        onChange={handleChange}
        onSubmit={() => submit()}
        onClear={clear}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        isLoading={isLoadingResults}
      />
      <SearchSuggestions
        suggestions={suggestions}
        activeIndex={activeIndex}
        onSelect={handleSelectSuggestion}
        isLoading={isLoadingSuggestions}
        visible={showSuggestions}
      />
      {query.trim() !== '' && (
        <SearchResults
          results={results}
          isLoading={isLoadingResults}
          error={error}
        />
      )}
    </div>
  );
};

export default SearchBar;