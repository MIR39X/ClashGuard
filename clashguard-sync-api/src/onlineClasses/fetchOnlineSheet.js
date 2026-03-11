import { getOnlineClassesGvizUrl, ONLINE_CLASSES_DAY_SHEETS } from './constants.js';

export const fetchOnlineSheets = async () =>
  Promise.all(
    ONLINE_CLASSES_DAY_SHEETS.map(async (sheetName) => {
      const response = await fetch(getOnlineClassesGvizUrl(sheetName));
      if (!response.ok) {
        throw new Error(`Failed to fetch online classes sheet "${sheetName}" (${response.status})`);
      }

      return {
        sheetName,
        text: await response.text(),
      };
    }),
  );
