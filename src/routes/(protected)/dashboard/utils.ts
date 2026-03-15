const suffixMap = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
  zero: 'th',
} as Record<Intl.LDMLPluralRule, string>;

const plural_rule = new Intl.PluralRules('en-IN', {
  type: 'ordinal',
});

export const day_ordinal_formatter = (day: number) => {
  return `${day}${suffixMap[plural_rule.select(day)]}`;
};

export const full_date_formatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export const short_month_day_formatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  day: 'numeric',
});

export const short_date_formatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  day: '2-digit',
  year: '2-digit',
});

export const day_formatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
});

export const full_month_formatter = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
});

export const year_formatter = new Intl.DateTimeFormat('en-IN', {
  year: 'numeric',
});
