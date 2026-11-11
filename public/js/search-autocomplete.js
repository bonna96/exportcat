/**
 * Search Autocomplete & Instant Suggestions
 * FR-4: Real-time query suggestion with keyboard navigation & highlight
 */
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const dropdown = document.getElementById('autocomplete-dropdown');
  const searchForm = document.getElementById('search-form');

  if (!searchInput || !dropdown) return;

  let debounceTimer = null;
  let activeIndex = -1;
  let currentItems = [];

  // Determine current locale from URL or html lang
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const locale = (pathParts.length > 0 && /^[a-z]{2}-[a-z]{2}$/.test(pathParts[0])) 
    ? pathParts[0] 
    : (document.documentElement.lang || 'en-gb');

  function highlightMatch(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  function renderSuggestions(suggestions, query) {
    dropdown.innerHTML = '';
    activeIndex = -1;
    currentItems = [];

    if (!suggestions || suggestions.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'autocomplete-list';
    ul.setAttribute('role', 'listbox');

    suggestions.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'autocomplete-item';
      li.setAttribute('role', 'option');
      li.setAttribute('id', `autocomplete-opt-${index}`);

      const isCategory = item.type === 'category';
      const icon = isCategory ? 'folder' : 'package';
      
      li.innerHTML = `
        <span class="autocomplete-icon"><i data-lucide="${icon}"></i></span>
        <span class="autocomplete-text">${highlightMatch(item.text, query)}</span>
        <span class="autocomplete-tag">${item.type || 'product'}</span>
      `;

      li.addEventListener('click', () => {
        if (item.url) {
          window.location.href = item.url;
        } else {
          searchInput.value = item.text;
          searchForm.submit();
        }
      });

      li.addEventListener('mouseenter', () => {
        setActive(index);
      });

      ul.appendChild(li);
      currentItems.push(li);
    });

    dropdown.appendChild(ul);
    dropdown.style.display = 'block';

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function setActive(index) {
    currentItems.forEach((el, i) => {
      if (i === index) {
        el.classList.add('is-active');
        el.setAttribute('aria-selected', 'true');
      } else {
        el.classList.remove('is-active');
        el.setAttribute('aria-selected', 'false');
      }
    });
    activeIndex = index;
  }

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(debounceTimer);

    if (query.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search/autocomplete?q=${encodeURIComponent(query)}&locale=${locale}`);
        if (!res.ok) throw new Error('Autocomplete network error');
        const data = await res.json();
        renderSuggestions(data.suggestions || [], query);
      } catch (err) {
        console.warn('Autocomplete fetch failed:', err);
      }
    }, 200);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (dropdown.style.display === 'none' || currentItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (activeIndex + 1) % currentItems.length;
      setActive(nextIndex);
      currentItems[nextIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = activeIndex <= 0 ? currentItems.length - 1 : activeIndex - 1;
      setActive(prevIndex);
      currentItems[prevIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && currentItems[activeIndex]) {
        e.preventDefault();
        currentItems[activeIndex].click();
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      activeIndex = -1;
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
});
