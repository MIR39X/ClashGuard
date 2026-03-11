export const ONLINE_CLASSES_SHEET_ID = '1x_wi07pYRGObmWDFIoFpaHXmgj2YQQhTJMMwFRVNWwA';
export const ONLINE_CLASSES_CACHE_TTL_MS = 2 * 60 * 1000;
export const ONLINE_CLASSES_DAY_SHEETS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const getOnlineClassesGvizUrl = (sheetName) =>
  `https://docs.google.com/spreadsheets/d/${ONLINE_CLASSES_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
