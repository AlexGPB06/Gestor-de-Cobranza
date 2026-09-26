import '@testing-library/jest-dom';

// jsdom no implementa matchMedia y varios componentes lo consultan al montar.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom no implementa scrollTo y las vistas largas lo invocan.
window.scrollTo = window.scrollTo || (() => {});
