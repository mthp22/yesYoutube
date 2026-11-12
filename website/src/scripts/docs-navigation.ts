const initializeDocsNavigation = () => {
  const sidebar = document.querySelector<HTMLElement>('.docs-sidebar');

  if (!sidebar) return;

  const links = Array.from(
    sidebar.querySelectorAll<HTMLAnchorElement>('a[href*="#"]')
  );

  const sections = links
    .map((link) => {
      const id = link.hash.slice(1);
      return document.getElementById(id);
    })
    .filter((section): section is HTMLElement => section !== null);

  if (!sections.length) return;

  const updateActiveLink = (id: string) => {
    links.forEach((link) => {
      const active = link.hash === `#${id}`;

      link.classList.toggle('active', active);

      if (active) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top
        );

      if (visible.length) {
        updateActiveLink(visible[0].target.id);
      }
    },
    {
      rootMargin: '-110px 0px -65% 0px',
      threshold: 0
    }
  );

  sections.forEach((section) => observer.observe(section));

  links.forEach((link) => {
    link.addEventListener('click', () => {
      updateActiveLink(link.hash.slice(1));
    });
  });
};

document.addEventListener(
  'astro:page-load',
  initializeDocsNavigation
);

initializeDocsNavigation();