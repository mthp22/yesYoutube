const initializeCodeBlocks = () => {
  const codeBlocks = document.querySelectorAll<HTMLElement>(
    '.docs-content pre'
  );

  codeBlocks.forEach((block) => {
    if (block.dataset.copyInitialized) return;

    block.dataset.copyInitialized = 'true';

    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'docs-copy-button';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');

    block.appendChild(button);

    button.addEventListener('click', async () => {
      const code = block.querySelector('code');

      if (!code) return;

      try {
        await navigator.clipboard.writeText(code.textContent || '');

        button.textContent = 'Copied!';
        button.classList.add('is-copied');

        window.setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('is-copied');
        }, 1800);

      } catch {
        button.textContent = 'Copy unavailable';

        window.setTimeout(() => {
          button.textContent = 'Copy';
        }, 1800);
      }
    });
  });
};

document.addEventListener('astro:page-load', initializeCodeBlocks);

initializeCodeBlocks();