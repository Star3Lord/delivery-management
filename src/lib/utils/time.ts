export const msToTime = (v: number) => {
  const pad = (n: number, z = 2) => ('00' + n).slice(-z);

  const ms = v % 1000;
  v = (v - ms) / 1000;
  const ss = v % 60;
  v = (v - ss) / 60;
  const mm = v % 60;
  const hh = (v - mm) / 60;

  return pad(hh) + ':' + pad(mm) + ':' + pad(ss) + '.' + pad(ms, 3);
};

export const msToTimeInS = (v: number) => {
  const pad = (n: number, z = 2) => ('00' + n).slice(-z);

  const ms = v % 1000;
  v = (v - ms) / 1000;
  const ss = v % 60;
  v = (v - ss) / 60;
  const mm = v % 60;
  const hh = (v - mm) / 60;

  if (hh > 0) {
    return pad(hh) + ':' + pad(mm) + ':' + pad(ss);
  }
  return pad(mm) + ':' + pad(ss);
};

export const secondsToTime = (seconds: number, hideHH = false) => {
  const pad = (n: number) => ('00' + n).slice(-2);

  const ss = seconds % 60;
  seconds = (seconds - ss) / 60;
  const mm = seconds % 60;
  const hh = (seconds - mm) / 60;

  if (hh > 0 || !hideHH) {
    return pad(hh) + ':' + pad(mm) + ':' + pad(ss);
  }

  return pad(mm) + ':' + pad(ss);
};

export const minutesToTime = (minutes: number) => {
  const pad = (n: number) => ('00' + n).slice(-2);

  const mm = minutes % 60;
  const hh = (minutes - mm) / 60;

  return pad(hh) + ':' + pad(mm);
};

// export const msToTime = (s) => {
//   const pad = (n, z = 2) => ('00' + n).slice(-z);
//   return pad(s/3.6e6|0) + ':' + pad((s%3.6e6)/6e4 | 0) + ':' + pad((s%6e4)/1000|0) + '.' + pad(s%1000, 3);
// }

export const format_time = (s: number) => {
  const dtFormat = new Intl.DateTimeFormat('en-US', {
    timeStyle: 'medium',
    timeZone: 'UTC',
  });

  return dtFormat.format(new Date(s * 1e3));
};
