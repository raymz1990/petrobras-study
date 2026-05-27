/* ================================================
   DIGITALCRON — Page Layout Template (JS helper)
   Injeta sidebar + navbar dinamicamente
   ================================================ */

DC.Layout = {
  // Chame no <head> de cada página de matéria
  // com o path relativo correto para a raiz
  async init(rootPath = '../../') {
    await this._injectSidebar(rootPath);
    await this._injectNavbar(rootPath);
    this._fixLinks(rootPath);
  },

  async _injectSidebar(rootPath) {
    const placeholder = document.getElementById('sidebar-placeholder');
    if (!placeholder) return;
    try {
      const res  = await fetch(rootPath + 'components/sidebar.html');
      const html = await res.text();
      placeholder.outerHTML = html;
    } catch(e) {
      console.warn('Sidebar load failed, using inline fallback');
    }
  },

  async _injectNavbar(rootPath) {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;
    try {
      const res  = await fetch(rootPath + 'components/navbar.html');
      const html = await res.text();
      placeholder.outerHTML = html;
      // Re-init after injection
      DC.Search.init('global-search', 'search-results');
      const themeBtn = document.getElementById('theme-toggle');
      themeBtn?.addEventListener('click', () => DC.Theme.toggle());
      DC.Theme.init();
    } catch(e) {
      console.warn('Navbar load failed');
    }
  },

  _fixLinks(rootPath) {
    // Ajusta links relativos se necessário
  }
};
