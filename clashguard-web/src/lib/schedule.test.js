import { buildClashes, getCourseKey, selectedEntriesFromCourses } from './schedule';
import { describe, expect, test } from 'vitest';

describe('schedule helpers', () => {
  test('getCourseKey normalizes course and section', () => {
    const key = getCourseKey({
      course: ' cy3005 ',
      section: ' bcy-6a ',
    });
    expect(key).toBe('CY3005|BCY-6A');
  });

  test('buildClashes finds same-day overlaps only', () => {
    const entries = [
      {
        id: 'a',
        day: 'Wednesday',
        startMinutes: 535,
        endMinutes: 585,
      },
      {
        id: 'b',
        day: 'Wednesday',
        startMinutes: 550,
        endMinutes: 600,
      },
      {
        id: 'c',
        day: 'Thursday',
        startMinutes: 550,
        endMinutes: 600,
      },
    ];

    const clashes = buildClashes(entries);
    expect(clashes).toHaveLength(1);
    expect(clashes[0].a.id).toBe('a');
    expect(clashes[0].b.id).toBe('b');
  });

  test('selectedEntriesFromCourses derives from all classes by selected key and dedupes by id', () => {
    const selected = [
      {
        key: 'CY3005|BCY-6A',
      },
    ];
    const allClasses = [
      { id: 'y1', course: 'CY3005', section: 'BCY-6A', day: 'Monday', startMinutes: 480, endMinutes: 530 },
      { id: 'y1', course: 'CY3005', section: 'BCY-6A', day: 'Monday', startMinutes: 480, endMinutes: 530 },
      { id: 'z1', course: 'CS2005', section: 'BCS-4K', day: 'Tuesday', startMinutes: 540, endMinutes: 590 },
    ];
    const out = selectedEntriesFromCourses(selected, allClasses);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('y1');
  });
});
