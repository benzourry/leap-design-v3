import { compileTpl, getMermaidTheme } from './utils';

describe('Markdown rendering', () => {
  it('renders Mermaid fences with four spaces of shared indentation', () => {
    const markdown = [
      '<x-markdown>',
      '    ~~~mermaid',
      '    graph TD',
      '      A[Start] --> B{Is it?};',
      '      B -->|Yes| C[OK];',
      '      B -->|No| D[Cancel];',
      '    ~~~',
      '</x-markdown>'
    ].join('\n');

    const rendered = compileTpl(markdown, {}, 'mermaid-indent-test');

    expect(rendered).toContain('class="mermaid"');
  });
});

describe('getMermaidTheme', () => {
  let previousTheme: string | null;
  let darkModeElement: HTMLDivElement;

  beforeEach(() => {
    previousTheme = document.documentElement.getAttribute('data-bs-theme');
    document.documentElement.setAttribute('data-bs-theme', 'light');
    darkModeElement = document.createElement('div');
    document.body.appendChild(darkModeElement);
  });

  afterEach(() => {
    if (previousTheme === null) {
      document.documentElement.removeAttribute('data-bs-theme');
    } else {
      document.documentElement.setAttribute('data-bs-theme', previousTheme);
    }
    darkModeElement.remove();
  });

  it('uses Mermaid dark theme when the application theme is dark', () => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');

    expect(getMermaidTheme()).toBe('dark');
  });

  it('uses Mermaid dark theme for dark-mode containers', () => {
    darkModeElement.classList.add('dark-mode');

    expect(getMermaidTheme()).toBe('dark');
  });

  it('uses Mermaid default theme when the application theme is light', () => {
    expect(getMermaidTheme()).toBe('default');
  });
});
