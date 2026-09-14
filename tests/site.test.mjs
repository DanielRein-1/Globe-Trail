import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'next/link' || specifier === 'next/navigation') return nextResolve(`${specifier}.js`, context);
  return nextResolve(specifier, context);
} });
const { SiteNavigationLinks } = await import('../components/site/SiteNavigation.tsx');
const { CountryShell } = await import('../components/features/countries/CountryShell.tsx');
const { default: Home } = await import('../app/page.tsx');
hooks.deregister();
const render = (component, props = {}) => renderToStaticMarkup(createElement(component, props));

test('navigation identifies Home and the country section without matching unrelated paths', () => {
  for (const [pathname, active, value] of [['/', '/', 'page'], ['/countries', '/countries', 'page'], ['/countries/KE', '/countries', 'location'], ['/countries-other', null, null]]) {
    const html = render(SiteNavigationLinks, { pathname });
    const links = html.match(/<a\b[^>]*>/g);
    assert.equal(links.length, 2);
    const current = links.filter(link => link.includes('aria-current='));
    assert.equal(current.length, active ? 1 : 0);
    if (active) {
      assert.ok(current[0].includes(`href="${active}"`));
      assert.ok(current[0].includes(`aria-current="${value}"`));
      assert.ok(current[0].includes('bg-teal-50'), 'Current page and section retain active styling');
    }
  }
});

test('homepage provides one h1 and a country discovery CTA without starter links', () => {
  const html = render(Home);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /href="\/countries"/);
  assert.match(html, /GlobeTrail/);
  assert.match(html, /50 km/);
  assert.doesNotMatch(html, /Create Next App|vercel\.com|next\.svg|\/login|\/register/);
});

test('country wrapper retains its content and attribution without duplicate site landmarks', () => {
  const html = render(CountryShell, { children: createElement('a', { href: '/countries?search=Kenya&continent=Africa&page=2&limit=6' }, 'Back to results') });
  assert.doesNotMatch(html, /<(header|footer|main|nav)\b/);
  assert.match(html, /countries\.dev/);
  assert.match(html, /search=Kenya&amp;continent=Africa&amp;page=2&amp;limit=6/);
});
