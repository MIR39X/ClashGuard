import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import App from './App';

describe('ClashGuard archive landing page', () => {
  test('shows the archive message and project lifetime', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'CLASHGUARD' })).toBeInTheDocument();
    expect(screen.getByText(/FAST now provides its new timetable/i)).toBeInTheDocument();
    expect(screen.getByText('FEBRUARY 2026')).toBeInTheDocument();
    expect(screen.getByText('JUNE 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /thank you for using clashguard/i })).toBeInTheDocument();
    expect(screen.queryByText(/it guarded the clashes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/archived with gratitude/i)).not.toBeInTheDocument();
  });

  test('only exposes allowlisted repository links', () => {
    render(<App />);

    const links = screen.getAllByRole('link');
    const externalLinks = links.filter((link) => link.getAttribute('target') === '_blank');

    expect(externalLinks).toHaveLength(3);
    externalLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', 'https://github.com/MIR39X/ClashGuard');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    });
  });
});
