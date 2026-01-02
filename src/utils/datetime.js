/**
 * @typedef {import('dayjs').Dayjs} Dayjs
 */

/**
 * Formats a timestamp into a localized time label.
 *
 * @param {number | null | undefined} ts
 * @param {string | null | undefined} lang
 * @returns {string}
 */
export function formatTime(ts, lang) {
  if (!ts) return '';
  try {
    let time = new Date(ts).toLocaleTimeString(lang || undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    time = time
      .replace(/\s*a\.?\s*m\.?/giu, ' AM')
      .replace(/\s*p\.?\s*m\.?/giu, ' PM');

    return time;
  } catch {
    return '';
  }
}

/**
 * Returns a timestamp for `day` with the time components taken from `time`.
 *
 * @param {Dayjs} day
 * @param {Dayjs | null | undefined} time
 * @returns {number}
 */
export function mergeDayAndTime(day, time) {
  return day
    .hour(time?.hour() || 0)
    .minute(time?.minute() || 0)
    .second(time?.second() || 0)
    .millisecond(0)
    .valueOf();
}
