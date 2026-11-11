/**
 * Unit & Currency Dynamic Converter
 * FR-10: Multi-currency display (USD, EUR, GBP, JPY, BDT) & measurement units
 */
(function() {
  const EXCHANGE_RATES = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 152.5,
    BDT: 118.5
  };

  const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    BDT: '৳'
  };

  function formatPrice(amount, currency) {
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    if (currency === 'JPY' || currency === 'BDT') {
      return `${symbol} ${Math.round(amount).toLocaleString()}`;
    }
    return `${symbol} ${amount.toFixed(2).toLocaleString()}`;
  }

  function updateAllPrices(targetCurrency) {
    const rate = EXCHANGE_RATES[targetCurrency] || 1.0;
    const priceElements = document.querySelectorAll('[data-usd-price]');

    priceElements.forEach((el) => {
      const baseUsd = parseFloat(el.getAttribute('data-usd-price'));
      if (!isNaN(baseUsd)) {
        const converted = baseUsd * rate;
        el.textContent = formatPrice(converted, targetCurrency);
      }
    });

    const currencyLabels = document.querySelectorAll('.active-currency-code');
    currencyLabels.forEach(el => el.textContent = targetCurrency);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const currencySelect = document.getElementById('currency-selector');
    const savedCurrency = localStorage.getItem('exportcat_currency') || 'USD';

    if (currencySelect) {
      currencySelect.value = savedCurrency;
      currencySelect.addEventListener('change', (e) => {
        const selected = e.target.value;
        localStorage.setItem('exportcat_currency', selected);
        updateAllPrices(selected);
      });
    }

    if (savedCurrency !== 'USD') {
      updateAllPrices(savedCurrency);
    }
  });

  window.ExportCatCurrency = {
    updateAllPrices,
    formatPrice
  };
})();
