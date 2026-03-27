import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'yyyy-MM-dd');
  } catch (error) {
    return '';
  }
};

export const formatDisplayDate = (date) => {
  if (!date) return '';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'MMM dd, yyyy');
  } catch (error) {
    return '';
  }
};

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount || 0);
};

export const getDateRange = (period) => {
  const now = new Date();

  switch (period) {
    case 'this_month':
      return {
        start_date: formatDate(startOfMonth(now)),
        end_date: formatDate(endOfMonth(now)),
      };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return {
        start_date: formatDate(startOfMonth(lastMonth)),
        end_date: formatDate(endOfMonth(lastMonth)),
      };
    case 'this_year':
      return {
        start_date: formatDate(startOfYear(now)),
        end_date: formatDate(endOfYear(now)),
      };
    case 'last_year':
      const lastYear = subYears(now, 1);
      return {
        start_date: formatDate(startOfYear(lastYear)),
        end_date: formatDate(endOfYear(lastYear)),
      };
    default:
      return {
        start_date: null,
        end_date: null,
      };
  }
};

export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return ((value / total) * 100).toFixed(1);
};
