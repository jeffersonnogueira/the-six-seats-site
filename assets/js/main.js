(function(){
  const btn = document.querySelector('[data-mobile-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');

  if(btn && menu){
    menu.style.display = 'none';
    btn.addEventListener('click', () => {
      const open = menu.getAttribute('data-open') === '1';
      menu.setAttribute('data-open', open ? '0' : '1');
      menu.style.display = open ? 'none' : 'block';
    });
  }

  // active nav highlight
  const path = (location.pathname || "/").toLowerCase();
  document.querySelectorAll('a[data-nav]').forEach(a => {
    const href = (a.getAttribute('href') || "").toLowerCase();
    if(!href) return;

    // handle clean urls and html
    const normalizedHref = href.replace(".html","");
    const normalizedPath = path.replace(".html","");

    if(normalizedHref === normalizedPath || normalizedHref === "/" && normalizedPath === "/"){
      a.classList.add("active");
    }
  });
})();
