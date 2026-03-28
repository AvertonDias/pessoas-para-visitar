'use client';

import type { Visit, Name } from '@/app/page';
import { subMonths, isAfter } from 'date-fns';

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
  const mostRecentVisitDate = visitHistory.reduce((latest, visit) => {
    const visitDate = new Date(visit.date);
    return isAfter(visitDate, latest) ? visitDate : latest;
  }, new Date(0)); // Start with a very old date

  if (isAfter(mostRecentVisitDate, threeMonthsAgo)) {
    return 'regular'; // Active in the last 3 months
  }

  if (isAfter(mostRecentVisitDate, sixMonthsAgo)) {
    return 'irregular'; // Active between 3 and 6 months ago
  }

  return 'inativo'; // No activity in the last 6 months
}
