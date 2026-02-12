(function(){
  const mobileBtn = document.querySelector('[data-mobile-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');

  if (mobileBtn && mobileMenu){
    mobileBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.getAttribute('data-open') === '1';
      mobileMenu.setAttribute('data-open', isOpen ? '0' : '1');
      mobileMenu.style.display = isOpen ? 'none' : 'block';
      mobileBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });

    // start closed
    mobileMenu.style.display = 'none';
    mobileMenu.setAttribute('data-open','0');
    mobileBtn.setAttribute('aria-expanded','false');
  }

  // Active link highlight based on path
  const path = (location.pathname || "/").split("/").pop() || "index.html";
  const key = path.toLowerCase();

  const markActive = (selector) => {
    document.querySelectorAll(selector).forEach(a => {
      const href = (a.getAttribute('href') || "").toLowerCase();
      if (!href) return;

      // allow clean urls too
      const clean = href.replace(".html","");
      const currentClean = key.replace(".html","");

      if (href.includes(key) || clean === `/${currentClean}` || clean === currentClean){
        a.classList.add('active');
      }
    });
  };

  markActive('a[data-nav]');
})();
