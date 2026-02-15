import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';

const mockClasses = [
  {
    id: 'c1',
    title: 'CY3005-NS BCY-6A',
    course: 'CY3005',
    section: 'BCY-6A',
    teacher: 'Dr. Sufian Hameed',
    room: 'C-21 Academic Block II (50)',
    day: 'Wednesday',
    start: '10:45',
    end: '11:35',
    startMinutes: 645,
    endMinutes: 695,
  },
  {
    id: 'c2',
    title: 'CY3005-NS BCY-6A',
    course: 'CY3005',
    section: 'BCY-6A',
    teacher: 'Dr. Sufian Hameed',
    room: 'C-21 Academic Block II (50)',
    day: 'Friday',
    start: '12:35',
    end: '1:25',
    startMinutes: 755,
    endMinutes: 805,
  },
];

const clashClasses = [
  {
    id: 'mta-1',
    title: 'MT2005-Prob BDS-4A',
    course: 'MT2005',
    section: 'BDS-4A',
    teacher: 'Muhammad Amjad',
    room: 'E-33 Academic Block II (52)',
    day: 'Wednesday',
    start: '08:55',
    end: '09:45',
    startMinutes: 535,
    endMinutes: 585,
  },
  {
    id: 'cy-1',
    title: 'CY4045-BLKC BCY-6A',
    course: 'CY4045',
    section: 'BCY-6A',
    teacher: 'Nouman Rajput',
    room: 'Academic Block II Lab-13 (47)',
    day: 'Wednesday',
    start: '08:55',
    end: '09:45',
    startMinutes: 535,
    endMinutes: 585,
  },
  {
    id: 'mtb-1',
    title: 'MT2005-Prob BDS-4B',
    course: 'MT2005',
    section: 'BDS-4B',
    teacher: 'Muhammad Amjad',
    room: 'E-34 Academic Block II (52)',
    day: 'Wednesday',
    start: '11:40',
    end: '12:30',
    startMinutes: 700,
    endMinutes: 750,
  },
  {
    id: 'mtc-1',
    title: 'MT2005-Prob BDS-4C',
    course: 'MT2005',
    section: 'BDS-4C',
    teacher: 'Another Teacher',
    room: 'E-35 Academic Block II (52)',
    day: 'Thursday',
    start: '11:40',
    end: '12:30',
    startMinutes: 700,
    endMinutes: 750,
  },
];

const filterClasses = [
  {
    id: 'f1',
    title: 'CS2005-DBS BCS-4K',
    course: 'CS2005',
    section: 'BCS-4K',
    teacher: 'Ghulam Qadir',
    room: 'R-11',
    day: 'Friday',
    start: '02:25',
    end: '03:15',
    startMinutes: 865,
    endMinutes: 915,
  },
  {
    id: 'f2',
    title: 'CY3005-NS BCY-6A',
    course: 'CY3005',
    section: 'BCY-6A',
    teacher: 'Dr. Sufian Hameed',
    room: 'C-21',
    day: 'Wednesday',
    start: '10:45',
    end: '11:35',
    startMinutes: 645,
    endMinutes: 695,
  },
];

describe('App flow', () => {
  beforeEach(() => {
    try {
      window.localStorage?.clear?.();
    } catch {
      // ignore storage reset issues in constrained test envs
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ classes: mockClasses }),
    });
  });

  test('select course and open timetable', async () => {
    render(<App />);

    await screen.findByText('CY3005-NS BCY-6A');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: /View My Timetable/i }));

    await waitFor(() => {
      expect(screen.getByText(/\[02\]_MY TIMETABLE/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('CY3005-NS BCY-6A').length).toBeGreaterThan(0);
  });

  test('apply alternative updates selected course in timetable', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ classes: clashClasses }),
    });

    render(<App />);

    await screen.findByText('MT2005-Prob BDS-4A');

    const mtCard = screen.getByText('MT2005-Prob BDS-4A').closest('article');
    const cyCard = screen.getByText('CY4045-BLKC BCY-6A').closest('article');

    fireEvent.click(within(mtCard).getByRole('button', { name: 'Add' }));
    fireEvent.click(within(cyCard).getByRole('button', { name: 'Add' }));

    fireEvent.click(screen.getByRole('button', { name: /View My Timetable/i }));

    await screen.findByText(/\[02\]_MY TIMETABLE/i);
    fireEvent.click(screen.getAllByRole('button', { name: /Alternatives/i })[0]);

    await screen.findByText(/\[04\]_ALTERNATIVES/i);
    expect(screen.getByText('MT2005-Prob BDS-4B')).toBeInTheDocument();

    const altCard = screen.getByText('MT2005-Prob BDS-4B').closest('div');
    fireEvent.click(within(altCard).getByRole('button', { name: /Apply Alternative/i }));

    fireEvent.click(screen.getByRole('button', { name: /Back To Timetable/i }));
    await screen.findByText(/\[02\]_MY TIMETABLE/i);

    expect(screen.getAllByText('MT2005-Prob BDS-4B').length).toBeGreaterThan(0);
    expect(screen.queryByText('MT2005-Prob BDS-4A')).not.toBeInTheDocument();
  });

  test('section filter narrows available courses list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ classes: filterClasses }),
    });

    render(<App />);
    await screen.findByText('CS2005-DBS BCS-4K');
    expect(screen.getByText('CY3005-NS BCY-6A')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('BCY-6A / BCS-4K'), { target: { value: 'BCS-4K' } });
    await waitFor(() => {
      expect(screen.getByText('CS2005-DBS BCS-4K')).toBeInTheDocument();
    });
    expect(screen.queryByText('CY3005-NS BCY-6A')).not.toBeInTheDocument();
  });

  test('clash report count and teacher-filtered alternatives are shown', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ classes: clashClasses }),
    });

    render(<App />);
    await screen.findByText('MT2005-Prob BDS-4A');

    fireEvent.click(within(screen.getByText('MT2005-Prob BDS-4A').closest('article')).getByRole('button', { name: 'Add' }));
    fireEvent.click(within(screen.getByText('CY4045-BLKC BCY-6A').closest('article')).getByRole('button', { name: 'Add' }));

    fireEvent.click(screen.getByRole('button', { name: /View My Timetable/i }));
    await screen.findByText(/\[02\]_MY TIMETABLE/i);

    fireEvent.click(screen.getAllByRole('button', { name: /Clash Report/i })[0]);
    await screen.findByText(/\[03\]_CLASH REPORT/i);
    expect(screen.getByText(/clashes found:\s*1/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Alternatives$/i }));
    await screen.findByText(/\[04\]_ALTERNATIVES/i);

    fireEvent.change(screen.getByPlaceholderText(/Filter alternatives by teacher/i), {
      target: { value: 'Another Teacher' },
    });
    await waitFor(() => {
      expect(screen.getByText('MT2005-Prob BDS-4C')).toBeInTheDocument();
    });
    expect(screen.queryByText('MT2005-Prob BDS-4B')).not.toBeInTheDocument();
  });
});
