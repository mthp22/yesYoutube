interface SearchEntry {
  id: string;
  title: string;
  label: string;
  labelMatch: string;
  titleMatch: string;
  headingMatch: string;
  body: string;
  bodyMatch: string;
  headings: Array<{ id: string; text: string; match: string }>;
}

interface SearchResult {
  targetId: string;
  title: string;
  label: string;
  subheading?: string;
  excerpt: string;
  excerptMatch: number;
}

const MAX_RESULTS = 8;

const createSlug = (text: string, taken: Set<string>): string => {
  const base =
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section';

  let slug = base;
  let counter = 2;

  while (taken.has(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  taken.add(slug);
  return slug;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const highlight = (value: string, query: string, from = 0): string => {
  const index = value.toLowerCase().indexOf(query, from);

  if (index === -1) return escapeHtml(value);

  return (
    escapeHtml(value.slice(0, index)) +
    '<mark>' +
    escapeHtml(value.slice(index, index + query.length)) +
    '</mark>' +
    escapeHtml(value.slice(index + query.length))
  );
};

const buildExcerpt = (
  body: string,
  query: string
): { excerpt: string; index: number } => {
  const index = body.toLowerCase().indexOf(query);

  if (index === -1) return { excerpt: body.slice(0, 120), index: -1 };

  const start = Math.max(0, index - 50);
  const end = Math.min(body.length, index + query.length + 70);

  return {
    excerpt: `${start > 0 ? '…' : ''}${body.slice(start, end)}${
      end < body.length ? '…' : ''
    }`,
    index: index - start + (start > 0 ? 1 : 0)
  };
};

const initializeDocsSearch = () => {
  const sidebar = document.querySelector<HTMLElement>('.docs-sidebar');
  const input = document.querySelector<HTMLInputElement>('.docs-search-input');
  const results = document.querySelector<HTMLElement>('.docs-search-results');
  const status = document.querySelector<HTMLElement>('.docs-search-status');

  if (!sidebar || !input || !results) return;
  if (input.dataset.searchInitialized === 'true') return;
  input.dataset.searchInitialized = 'true';

  const sections = Array.from(
    document.querySelectorAll<HTMLElement>('.docs-section')
  );

  if (!sections.length) return;

  const takenIds = new Set(
    sections.map((section) => section.id).filter(Boolean)
  );

  const entries: SearchEntry[] = sections
    .filter((section) => section.id)
    .map((section) => {
      const title = (section.querySelector('h2')?.textContent ?? '').trim();
      const label = (section.querySelector('.eyebrow')?.textContent ?? '')
        .trim();
      const fullText = (section.textContent ?? '').replace(/\s+/g, ' ').trim();
      // The eyebrow is displayed separately in results — drop it from the
      // excerpt body so it is not shown twice.
      const body = label && fullText.startsWith(label)
        ? fullText.slice(label.length).trim()
        : fullText;

      const headings = Array.from(section.querySelectorAll('h3'))
        .map((heading) => {
          const text = (heading.textContent ?? '').trim();

          if (!text) return null;

          if (!heading.id) {
            heading.id = createSlug(text, takenIds);
          }

          return {
            id: heading.id,
            text,
            match: text.toLowerCase()
          };
        })
        .filter((heading): heading is SearchEntry['headings'][number] =>
          Boolean(heading)
        );

      return {
        id: section.id,
        title,
        label,
        labelMatch: label.toLowerCase(),
        titleMatch: title.toLowerCase(),
        headingMatch: headings.map((heading) => heading.text).join(' '),
        body,
        bodyMatch: body.toLowerCase(),
        headings
      };
    })
    .filter((entry) => entry.title);

  if (!entries.length) return;

  const search = (query: string): SearchResult[] => {
    const matches = entries
      .map((entry): SearchResult | null => {
        let score = 0;

        if (entry.titleMatch.includes(query)) {
          score += entry.titleMatch.startsWith(query) ? 100 : 80;
        }

        if (entry.headingMatch.includes(query)) score += 50;
        if (entry.labelMatch.includes(query)) score += 40;
        if (entry.bodyMatch.includes(query)) score += 20;

        if (!score) return null;

        // Deep-link to the matching heading when there is one.
        const heading = entry.headings.find((item) =>
          item.match.includes(query)
        );

        const excerpt = buildExcerpt(
          entry.body.length > 400 ? entry.body.slice(0, 400) : entry.body,
          query
        );

        return {
          targetId: heading?.id ?? entry.id,
          title: entry.title,
          label: entry.label,
          ...(heading ? { subheading: heading.text } : {}),
          excerpt: excerpt.excerpt,
          excerptMatch: excerpt.index
        };
      })
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => b.title.length - a.title.length);

    return matches.slice(0, MAX_RESULTS);
  };

  const close = () => {
    results.hidden = true;
    results.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
  };

  const open = (html: string, message: string) => {
    results.innerHTML = html;
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');

    if (status) status.textContent = message;
  };

  const render = () => {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      close();
      if (status) status.textContent = '';
      return;
    }

    const matches = search(query);

    if (!matches.length) {
      open(
        `<p class="docs-search-empty">No results for “${escapeHtml(
          input.value.trim()
        )}”.</p>`,
        'No results'
      );
      return;
    }

    const html = matches
      .map((result) => {
        const excerpt =
          result.excerptMatch !== -1
            ? highlight(result.excerpt, query, result.excerptMatch)
            : escapeHtml(result.excerpt);

        const subheading = result.subheading
          ? `<span class="docs-search-result-sub">${escapeHtml(
              result.subheading
            )}</span>`
          : '';

        return `
          <a class="docs-search-result" href="#${result.targetId}">
            <span class="docs-search-result-title">${escapeHtml(
              result.title
            )}</span>
            <span class="docs-search-result-label">${escapeHtml(
              result.label
            )}</span>
            ${subheading}
            <span class="docs-search-result-excerpt">${excerpt}</span>
          </a>`;
      })
      .join('');

    open(
      html,
      `${matches.length} result${matches.length === 1 ? '' : 's'}`
    );
  };

  const resultLinks = () =>
    Array.from(results.querySelectorAll<HTMLAnchorElement>('a'));

  const setActive = (active: HTMLAnchorElement | undefined) => {
    resultLinks().forEach((link) => {
      link.classList.toggle('is-active', link === active);
    });
  };

  input.addEventListener('input', render);

  input.addEventListener('keydown', (event) => {
    const links = resultLinks();

    if (event.key === 'Escape') {
      input.value = '';
      close();
      if (status) status.textContent = '';
      input.blur();
      return;
    }

    if (!links.length) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      const current = links.findIndex((link) =>
        link.classList.contains('is-active')
      );
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next =
        current === -1
          ? step === 1
            ? 0
            : links.length - 1
          : (current + step + links.length) % links.length;

      setActive(links[next]);
      links[next].scrollIntoView({ block: 'nearest' });
      return;
    }

    if (event.key === 'Enter') {
      const active =
        links.find((link) => link.classList.contains('is-active')) ?? links[0];

      event.preventDefault();
      window.location.hash = active.getAttribute('href') ?? '';
      close();
    }
  });

  results.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a')) close();
  });

  document.addEventListener('click', (event) => {
    if (!(event.target as HTMLElement).closest('.docs-search')) close();
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) render();
  });

  let documentBound = false;

  const bindDocumentShortcuts = () => {
    if (documentBound) return;
    documentBound = true;

    document.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement;
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.focus();
        input.select();
        return;
      }

      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        input.focus();
      }
    });
  };

  bindDocumentShortcuts();
};

document.addEventListener('astro:page-load', initializeDocsSearch);

initializeDocsSearch();