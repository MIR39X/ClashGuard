import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import App from './App';

describe('ClashGuard archive landing page', () => {
  test('shows the archive message and project lifetime', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /it guarded the clashes/i })).toBeInTheDocument();
    expect(screen.getByText(/FAST's new timetable now in place/i)).toBeInTheDocument();
    expect(screen.getByText('February')).toBeInTheDocument();
    expect(screen.getByText('June')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /thank you/i })).toBeInTheDocument();
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
