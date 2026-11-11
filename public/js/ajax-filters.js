/**
 * Facet & Filter Management
 * FR-5: Multi-attribute faceted filtering with seamless URL sync
 */
document.addEventListener('DOMContentLoaded', () => {
  const facetForm = document.getElementById('facet-form');
  const sidebar = document.getElementById('facet-sidebar');
  if (!sidebar) return;

  const checkboxes = sidebar.querySelectorAll('input[type="checkbox"]');
  const applyBtn = document.getElementById('apply-filters-btn');
  const clearBtn = document.getElementById('clear-filters-btn');

  function collectFilterUrl() {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    // Remove existing filter keys
    params.delete('material');
    params.delete('certification');
    params.delete('origin');
    params.delete('page'); // Reset to page 1

    checkboxes.forEach((cb) => {
      if (cb.checked) {
        params.append(cb.name, cb.value);
      }
    });

    const minPriceInput = document.getElementById('filter-min-price');
    const maxPriceInput = document.getElementById('filter-max-price');
    if (minPriceInput && minPriceInput.value) {
      params.set('minPrice', minPriceInput.value);
    } else {
      params.delete('minPrice');
    }

    if (maxPriceInput && maxPriceInput.value) {
      params.set('maxPrice', maxPriceInput.value);
    } else {
      params.delete('maxPrice');
    }

    return url.pathname + '?' + params.toString();
  }

  checkboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      // Auto-submit or trigger URL navigation
      window.location.href = collectFilterUrl();
    });
  });

  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = collectFilterUrl();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL(window.location.href);
      const params = url.searchParams;
      params.delete('material');
      params.delete('certification');
      params.delete('origin');
      params.delete('minPrice');
      params.delete('maxPrice');
      params.delete('page');
      window.location.href = url.pathname + (params.toString() ? '?' + params.toString() : '');
    });
  }
});
