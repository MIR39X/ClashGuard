import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';

const mockClassesResponse = (classes) => ({
  ok: true,
  status: 200,
  headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => ({ classes }),
});

const mockOnlineClassesResponse = (items, schedule = []) => ({
  ok: true,
  status: 200,
  headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => ({
    status: 'ok',
    fetchedAt: '2026-03-12T12:00:00.000Z',
    count: items.length,
    schedule,
    items,
  }),
});

const makeFetchMock = ({ classes = mockClasses, onlineClasses = [], onlineSchedule = [] } = {}) =>
  vi.fn((input) => {
    const url = String(input || '');
    if (url.includes('/online-classes')) {
      return Promise.resolve(mockOnlineClassesResponse(onlineClasses, onlineSchedule));
    }
    return Promise.resolve(mockClassesResponse(classes));
  });

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

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

const gradeClasses = [
  {
    id: 'g1',
    title: 'MT2005-Prob BDS-4A',
    course: 'MT2005',
    section: 'BDS-4A',
    teacher: 'Syed Ashad',
    room: 'C-18 Academic Block II (50)',
    day: 'Monday',
    start: '12:40',
    end: '01:15',
    startMinutes: 760,
    endMinutes: 795,
  },
];

const onlineClasses = [
  {
    id: 'online-1',
    rowNumber: 4,
    sheetDay: 'Wednesday',
    teacher: 'Dr. Muhammad Farrukh Shahid',
    course: 'Agentic AI',
    time: '10:40 am to 11:15 AM',
    link: 'https://meet.google.com/siy-wavo-sww',
    rawSection: 'BCS A',
    resolvedSection: 'BCS-8A',
    matchedDays: ['Wednesday'],
    confidence: 'high',
    matchReasons: ['teacher-match'],
    timetableMatches: [{ title: 'AI4015-AAI BCS-8A', day: 'Wednesday', slot: '10:40-11:15' }],
  },
];

const onlineClassesGcr = [
  {
    id: 'online-gcr-1',
    rowNumber: 36,
    sheetDay: 'Wednesday',
    teacher: 'Abuzar Zafar',
    course: 'FMA',
    time: '9:20 - 9:55',
    link: 'Shared on GCR',
    rawSection: 'BCY-6A',
    resolvedSection: 'BCY-6A',
    matchedDays: ['Wednesday'],
    confidence: 'high',
    matchReasons: ['direct-section-from-sheet'],
    timetableMatches: [{ title: 'CY3004-FMA BCY-6A', day: 'Wednesday', slot: '9:20 - 9:55' }],
  },
];

const onlineClassesBareLink = [
  {
    id: 'online-bare-1',
    rowNumber: 40,
    sheetDay: 'Wednesday',
    teacher: 'Farhan Ali Memon',
    course: 'Arabic',
    time: '11:20 to 11:55',
    link: 'meet.google.com/tdz-zupy-xcw',
    rawSection: 'BCS-8A',
    resolvedSection: 'BCS-8A',
    matchedDays: ['Wednesday'],
    confidence: 'high',
    matchReasons: ['direct-section-from-sheet'],
    timetableMatches: [{ title: 'SS2034-Arab Lang. BCS-8A', day: 'Wednesday', slot: '11:20 - 11:55' }],
  },
];

const onlineSchedule = [
  {
    id: 'sched-1',
    title: 'CY3005-NS BCY-6A',
    teacher: 'Dr. Sufian Hameed',
    day: 'Wednesday',
    slot: '10:45 - 11:35',
    start: '10:45',
    end: '11:35',
    course: 'CY3005',
    section: 'BCY-6A',
  },
];

describe('App flow', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    try {
      window.localStorage?.clear?.();
    } catch {
      // ignore storage reset issues in constrained test envs
    }
    global.fetch = makeFetchMock();
  });

  test('select course and open timetable', async () => {
    render(<App />);

    expect(screen.getByText(/Take ClashGuard with you/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));

    await screen.findByText('CY3005-NS BCY-6A');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: /View My Timetable/i }));

    await waitFor(() => {
      expect(screen.getByText(/\[02\]_MY TIMETABLE/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('CY3005-NS BCY-6A').length).toBeGreaterThan(0);
  });

  test('apply alternative updates selected course in timetable', async () => {
    global.fetch = makeFetchMock({ classes: clashClasses });

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

    fireEvent.click(screen.getAllByRole('button', { name: /Apply Alternative/i })[0]);

    fireEvent.click(screen.getByRole('button', { name: /Back To Selection/i }));
    await screen.findByText(/SELECT\s*MY COURSES/i);
    fireEvent.click(screen.getByRole('button', { name: /View My Timetable/i }));
    await screen.findByText(/\[02\]_MY TIMETABLE/i);

    expect(screen.getAllByText('MT2005-Prob BDS-4B').length).toBeGreaterThan(0);
    expect(screen.queryByText('MT2005-Prob BDS-4A')).not.toBeInTheDocument();
  });

  test('section filter narrows available courses list', async () => {
    global.fetch = makeFetchMock({ classes: filterClasses });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
    await screen.findByText('CS2005-DBS BCS-4K');
    expect(screen.getByText('CY3005-NS BCY-6A')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('BCY-6A / BCS-4K'), { target: { value: 'BCS-4K' } });
    await waitFor(() => {
      expect(screen.getByText('CS2005-DBS BCS-4K')).toBeInTheDocument();
    });
    expect(screen.queryByText('CY3005-NS BCY-6A')).not.toBeInTheDocument();
  });

  test('shows a loading message while courses are being fetched for the first time', async () => {
    const deferred = createDeferred();
    global.fetch = vi.fn().mockReturnValue(deferred.promise);

    render(<App />);

    expect(screen.getByText(/Take ClashGuard with you/i)).toBeInTheDocument();
    expect(screen.getByText(/Courses Are Loading/i)).toBeInTheDocument();
    expect(screen.getByText(/Fetching the latest timetable data/i)).toBeInTheDocument();

    deferred.resolve(mockClassesResponse(mockClasses));

    await screen.findByText('CY3005-NS BCY-6A');
    expect(screen.queryByText(/Courses Are Loading/i)).not.toBeInTheDocument();
  });

  test('apk prompt is dismissed permanently after user closes it', async () => {
    const firstRender = render(<App />);

    expect(screen.getByText(/Take ClashGuard with you/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Don't show this again/i }));

    expect(screen.queryByText(/Take ClashGuard with you/i)).not.toBeInTheDocument();

    firstRender.unmount();
    render(<App />);
    await screen.findByText('CY3005-NS BCY-6A');
    expect(screen.queryByText(/Take ClashGuard with you/i)).not.toBeInTheDocument();
  });

  test('temporary online classes page shows matched live results for a section', async () => {
    global.fetch = makeFetchMock({ onlineClasses });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
    await screen.findByText('CY3005-NS BCY-6A');
    fireEvent.change(screen.getByPlaceholderText('BCY-6A / BCS-4K'), { target: { value: 'BCS-8A' } });

    fireEvent.click(screen.getByRole('button', { name: /Temporary Online Classes/i }));

    await screen.findByText(/\[08\]_ONLINE CLASSES/i);
    expect(screen.getByText(/Experimental Feature/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    await screen.findByText('Agentic AI');
    expect(screen.getByText('Dr. Muhammad Farrukh Shahid')).toBeInTheDocument();
    expect(screen.getByText('BCS-8A')).toBeInTheDocument();
    expect(screen.getAllByText('Wednesday').length).toBeGreaterThan(0);
    expect(screen.queryByText('AI4015-AAI BCS-8A | Wednesday')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Wednesday Class/i })).toHaveAttribute(
      'href',
      'https://meet.google.com/siy-wavo-sww',
    );
    fireEvent.click(screen.getByText('Show Timetable Evidence'));
    expect(screen.getByText('AI4015-AAI BCS-8A | Wednesday')).toBeInTheDocument();
  });

  test('temporary online classes page shows a section-specific empty state', async () => {
    global.fetch = makeFetchMock({ onlineClasses: [] });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
    await screen.findByText('CY3005-NS BCY-6A');
    fireEvent.change(screen.getByPlaceholderText('BCY-6A / BCS-4K'), { target: { value: 'BCY-6A' } });

    fireEvent.click(screen.getByRole('button', { name: /Temporary Online Classes/i }));

    await screen.findByText(/\[08\]_ONLINE CLASSES/i);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
    expect(screen.getByText('No temporary online classes are listed for BCY-6A on Monday right now.')).toBeInTheDocument();
  });

  test('temporary online classes page shows scheduled class when no live link is listed yet', async () => {
    global.fetch = makeFetchMock({ onlineClasses: [], onlineSchedule });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
    await screen.findByText('CY3005-NS BCY-6A');
    fireEvent.change(screen.getByPlaceholderText('BCY-6A / BCS-4K'), { target: { value: 'BCY-6A' } });

    fireEvent.click(screen.getByRole('button', { name: /Temporary Online Classes/i }));

    await screen.findByText(/\[08\]_ONLINE CLASSES/i);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    expect(screen.getByText('BCY-6A has scheduled classes on Wednesday, but no live online link is currently listed in the temporary sheet.')).toBeInTheDocument();
    expect(screen.getByText('CY3005-NS BCY-6A')).toBeInTheDocument();
    expect(screen.getByText('No live link yet')).toBeInTheDocument();
  });

  test('temporary online classes page shows shared on gcr as a status instead of a broken link', async () => {
    global.fetch = makeFetchMock({ onlineClasses: onlineClassesGcr });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
    await screen.findByText('CY3005-NS BCY-6A');
    fireEvent.change(screen.getByPlaceholderText('BCY-6A / BCS-4K'), { target: { value: 'BCY-6A' } });
    fireEvent.click(screen.getByRole('button', { name: /Temporary Online Classes/i }));

    await screen.findByText(/\[08\]_ONLINE CLASSES/i);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    expect(screen.getByText('Abuzar Zafar')).toBeInTheDocument();
    expect(screen.getByText('FMA')).toBeInTheDocument();
    expect(screen.getByText('Shared on GCR')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open Wednesday Class/i })).not.toBeInTheDocument();
  });

  test('temporary online classes page normalizes bare meet links into clickable urls', async () => {
    global.fetch = makeFetchMock({ onlineClasses: onlineClassesBareLink });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
    await screen.findByText('CY3005-NS BCY-6A');
    fireEvent.change(screen.getByPlaceholderText('BCY-6A / BCS-4K'), { target: { value: 'BCS-8A' } });
    fireEvent.click(screen.getByRole('button', { name: /Temporary Online Classes/i }));

    await screen.findByText(/\[08\]_ONLINE CLASSES/i);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    expect(screen.getByText('Farhan Ali Memon')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Wednesday Class/i })).toHaveAttribute(
      'href',
      'https://meet.google.com/tdz-zupy-xcw',
    );
  });

  test('clash report count and teacher-filtered alternatives are shown', async () => {
    global.fetch = makeFetchMock({ classes: clashClasses });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
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

  test('grade page supports adding components and custom weightage calculations', async () => {
    global.fetch = makeFetchMock({ classes: gradeClasses });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
    await screen.findByText('MT2005-Prob BDS-4A');

    fireEvent.click(within(screen.getByText('MT2005-Prob BDS-4A').closest('article')).getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: /View My Timetable/i }));
    await screen.findByText(/\[02\]_MY TIMETABLE/i);

    fireEvent.click(screen.getAllByRole('button', { name: /^Grades$/i })[0]);
    await screen.findByText(/\[05\]_GRADES/i);

    fireEvent.click(screen.getByRole('button', { name: /MT2005-Prob BDS-4A/i }));
    await screen.findByText(/\[05\]_COURSE GRADE/i);

    const weightInputs = screen.getAllByPlaceholderText('e.g. 20');
    const scoreInputs = screen.getAllByPlaceholderText('17');
    const totalInputs = screen.getAllByPlaceholderText('25');

    fireEvent.change(weightInputs[0], { target: { value: '40' } });
    fireEvent.change(scoreInputs[0], { target: { value: '30' } });
    fireEvent.change(totalInputs[0], { target: { value: '40' } });

    fireEvent.click(screen.getByRole('button', { name: /Add Component/i }));

    const weightInputsAfter = screen.getAllByPlaceholderText('e.g. 20');
    const scoreInputsAfter = screen.getAllByPlaceholderText('17');
    const totalInputsAfter = screen.getAllByPlaceholderText('25');

    fireEvent.change(weightInputsAfter[1], { target: { value: '60' } });
    fireEvent.change(scoreInputsAfter[1], { target: { value: '45' } });
    fireEvent.change(totalInputsAfter[1], { target: { value: '60' } });

    expect(screen.getByText(/Configured Weight:/i)).toBeInTheDocument();
    expect(screen.getByText('100.00%')).toBeInTheDocument();
    expect(screen.getByText(/Achieved Points:/i)).toBeInTheDocument();
    expect(screen.getByText('75.00')).toBeInTheDocument();
  });

  test('custom course grade dropdown updates selected grade', async () => {
    global.fetch = makeFetchMock({ classes: gradeClasses });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
    await screen.findByText('MT2005-Prob BDS-4A');

    fireEvent.click(within(screen.getByText('MT2005-Prob BDS-4A').closest('article')).getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: /View My Timetable/i }));
    await screen.findByText(/\[02\]_MY TIMETABLE/i);

    fireEvent.click(screen.getAllByRole('button', { name: /^Grades$/i })[0]);
    await screen.findByText(/\[05\]_GRADES/i);

    fireEvent.click(screen.getByRole('button', { name: /MT2005-Prob BDS-4A/i }));
    await screen.findByText(/\[05\]_COURSE GRADE/i);

    fireEvent.click(screen.getByRole('button', { name: /Select grade/i }));
    fireEvent.click(screen.getByRole('button', { name: 'B+' }));

    fireEvent.click(screen.getByRole('button', { name: /^Back$/i }));
    await screen.findByText(/\[05\]_GRADES/i);

    expect(screen.getByText('B+')).toBeInTheDocument();
  });

  test('credit hours input can be cleared and replaced with a two digit value', async () => {
    global.fetch = makeFetchMock({ classes: gradeClasses });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Continue On Web/i }));
    await screen.findByText('MT2005-Prob BDS-4A');

    fireEvent.click(within(screen.getByText('MT2005-Prob BDS-4A').closest('article')).getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: /View My Timetable/i }));
    await screen.findByText(/\[02\]_MY TIMETABLE/i);

    fireEvent.click(screen.getAllByRole('button', { name: /^Grades$/i })[0]);
    await screen.findByText(/\[05\]_GRADES/i);

    const creditInput = screen.getByLabelText(/Credit Hours/i);

    fireEvent.change(creditInput, { target: { value: '' } });
    expect(creditInput).toHaveValue(null);

    fireEvent.change(creditInput, { target: { value: '10' } });
    expect(creditInput).toHaveValue(10);
  });
});
