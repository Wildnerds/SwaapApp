import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Returns a string like "5 minutes ago", "2 days ago"
 * @param date - a Date object, string (ISO), or number (timestamp)
 */
export function timeAgo(date: Date | string | number): string {
  let parsedDate: Date;

  if (typeof date === 'string') {
    parsedDate = parseISO(date);
  } else if (typeof date === 'number') {
    parsedDate = new Date(date);
  } else {
    parsedDate = date;
  }

  if (!isValid(parsedDate)) {
    return 'some time ago';
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true });
}
