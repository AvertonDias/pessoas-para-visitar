'use client';

import type { Visit, Name } from '@/lib/types';
import { subMonths, isAfter } from 'date-fns';

/**
 * Gets the most recent visit date from a history array.
 * @param visitHistory - The array of visits.
 * @returns The most recent visit date, or a very old date (epoch) if no visits exist.
 */
export function getMostRecentVisitDate(visitHistory: Visit[]): Date {
  if (!visitHistory || visitHistory.length === 0) {
    return new Date(0); // Represents "never visited" for sorting purposes
  }

  return visitHistory.reduce((latest, visit) => {
    const visitDate = new Date(visit.date);
    return isAfter(visitDate, latest) ? visitDate : latest;
  }, new Date(0));
}


/**
 * Calculates the status of a person based on their visit history.
 * Does not handle the 'removido' status, which is considered manual.
 * @param visitHistory - The array of visits for the person.
 * @returns The calculated status: 'regular', 'irregular', or 'inativo'.
 */
export function calculateStatusFromHistory(visitHistory: Visit[]): Omit<Name['status'], 'removido'> {
  if (!visitHistory || visitHistory.length === 0) {
    return 'inativo';
  }

  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);
  const sixMonthsAgo = subMonths(now, 6);

  // Find the most recent visit date
  const mostRecentVisitDate = getMostRecentVisitDate(visitHistory);

  if (mostRecentVisitDate.getTime() === 0) {
    return 'inativo';
  }

  if (isAfter(mostRecentVisitDate, threeMonthsAgo)) {
    return 'regular'; // Active in the last 3 months
  }

  if (isAfter(mostRecentVisitDate, sixMonthsAgo)) {
    return 'irregular'; // Active between 3 and 6 months ago
  }

  return 'inativo'; // No activity in the last 6 months
}
