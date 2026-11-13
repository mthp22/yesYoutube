/* Site-wide URLs.*/
const repository = (
  import.meta.env.PUBLIC_REPO_URL ??
  'https://github.com/YOUR_USERNAME/YesYouTube'
).replace(/\/+$/, '');

export const REPO_URL = repository;

export const CLONE_URL = `${repository}.git`;