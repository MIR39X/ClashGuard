export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  'https://clashguard.onrender.com'
).replace(/\/$/, '');

export const DAY_SHORT = {
  All: 'All',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const FREE_WINDOW_START = 8 * 60;
export const FREE_WINDOW_END = 16 * 60;
export const MIN_FREE_SLOT_MINUTES = 10;

export const STORAGE_KEYS = {
  CLASSES_FETCHED_AT: 'clashguard_all_classes_fetched_at',
  CLASSES_ETAG: 'clashguard_all_classes_etag',
  APK_PROMPT_DISMISSED: 'clashguard_apk_prompt_dismissed',
  SELECTED_COURSES: 'clashguard_selected_courses',
  GRADES_DATA: 'clashguard_grades_data',
  GRADE_RANGES: 'clashguard_grade_ranges',
  COURSE_CREDITS: 'clashguard_course_credits',
  FRIENDS: 'clashguard_friends',
  SECTION_FILTER: 'clashguard_section_filter',
  MOBILE_NAV_INDEX: 'clashguard_mobile_nav_index',
};

export const CLASSES_CACHE_TTL_MS = 15 * 60 * 1000;

export const BTN_BASE =
  'rounded-lg border border-signal px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-signal transition hover:bg-signal hover:text-white disabled:cursor-not-allowed disabled:border-signal/30 disabled:text-signal/35';

export const ALT_LIMITS = ['5', '10', '20', 'all'];

export const APK_DOWNLOAD_URL = '/clashguard.apk';
export const HEADER_WEBSITE_LOGO = '/logos/clashguard-logo-wordmark.png';
export const HEADER_MOBILE_LOGO = '/logos/clashguard-logo-mark.png';

export const ABOUT_ME = {
  name: 'Arsalan Mir',
  bio: 'I am just a chill guy.',
  linkedin: 'https://www.linkedin.com/in/arsalan-mir-24a62328a?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
  github: 'https://github.com/MIR39X',
  email: 'arsalanmir735@gmail.com',
};

export const DEFAULT_GRADE_RANGES = [
  { id: 'A', label: 'A', min: 85, max: 100, gpa: 4.0 },
  { id: 'A-', label: 'A-', min: 80, max: 84.99, gpa: 3.67 },
  { id: 'B+', label: 'B+', min: 75, max: 79.99, gpa: 3.33 },
  { id: 'B', label: 'B', min: 71, max: 74.99, gpa: 3.0 },
  { id: 'B-', label: 'B-', min: 68, max: 70.99, gpa: 2.67 },
  { id: 'C+', label: 'C+', min: 64, max: 67.99, gpa: 2.33 },
  { id: 'C', label: 'C', min: 61, max: 63.99, gpa: 2.0 },
  { id: 'C-', label: 'C-', min: 58, max: 60.99, gpa: 1.67 },
  { id: 'D+', label: 'D+', min: 55, max: 57.99, gpa: 1.33 },
  { id: 'D', label: 'D', min: 50, max: 54.99, gpa: 1.0 },
  { id: 'F', label: 'F', min: 0, max: 49.99, gpa: 0.0 },
];
