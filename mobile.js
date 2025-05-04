// mobile.js
function initMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || sidebar.offsetWidth > 65) return; // Only for slim sidebars
  
    const mobileMenuToggle = document.createElement('button');
    mobileMenuToggle.className = 'mobile-menu-toggle';
    mobileMenuToggle.innerHTML = '☰';
    document.body.appendChild(mobileMenuToggle);
  
    const mainContent = document.querySelector('.main-content');
  
    mobileMenuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      sidebar.classList.toggle('active');
      mainContent.classList.toggle('sidebar-active');
    });
  
    document.addEventListener('click', function(e) {
      if (!sidebar.contains(e.target) && e.target !== mobileMenuToggle) {
        sidebar.classList.remove('active');
        mainContent.classList.remove('sidebar-active');
      }
    });
  }
  
  document.addEventListener('DOMContentLoaded', initMobileMenu);