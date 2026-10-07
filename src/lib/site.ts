// Public project links shown on the landing, contribute, and contact pages.

export const CONTACT_EMAIL = 'oswinalex1@gmail.com';

export const GITHUB_PROFILE_URL = 'https://github.com/Alexoswin';

export const REPOS = {
  frontend: {
    name: 'AgentReach-frontend',
    url: 'https://github.com/Alexoswin/AgentReach-frontend',
  },
  backend: {
    name: 'AgentReach-backend',
    url: 'https://github.com/Alexoswin/AgentReach-backend',
  },
} as const;

export const LICENSE_NAME = 'AGPL-3.0';
export const LICENSE_URL = `${REPOS.frontend.url}/blob/main/LICENSE`;

export const SITE_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how' },
  { label: 'Analytics', href: '/#analytics' },
  { label: 'Docs', href: '/documentation' },
  { label: 'Contribute', href: '/contribute' },
  { label: 'Contact', href: '/contact' },
  { label: 'Sign in', href: '/login' },
];
