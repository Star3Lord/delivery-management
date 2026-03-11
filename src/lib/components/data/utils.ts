export const PALETTES = [
  {
    bg: 'bg-blue-500/12',
    text: 'text-blue-400',
    border: 'border-blue-500/10',
    accent: 'bg-blue-500/8',
    'just-bg': 'bg-blue-500',
  },
  {
    bg: 'bg-violet-500/12',
    text: 'text-violet-400',
    border: 'border-violet-500/10',
    accent: 'bg-violet-500/8',
    'just-bg': 'bg-violet-500',
  },
  {
    bg: 'bg-emerald-500/12',
    text: 'text-emerald-400',
    border: 'border-emerald-500/10',
    accent: 'bg-emerald-500/8',
    'just-bg': 'bg-emerald-500',
  },
  {
    bg: 'bg-amber-500/12',
    text: 'text-amber-400',
    border: 'border-amber-500/10',
    accent: 'bg-amber-500/8',
    'just-bg': 'bg-amber-500',
  },
  {
    bg: 'bg-rose-500/12',
    text: 'text-rose-400',
    border: 'border-rose-500/10',
    accent: 'bg-rose-500/8',
    'just-bg': 'bg-rose-500',
  },
  {
    bg: 'bg-cyan-500/12',
    text: 'text-cyan-400',
    border: 'border-cyan-500/10',
    accent: 'bg-cyan-500/8',
    'just-bg': 'bg-cyan-500',
  },
  {
    bg: 'bg-fuchsia-500/12',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/10',
    accent: 'bg-fuchsia-500/8',
    'just-bg': 'bg-fuchsia-500',
  },
  {
    bg: 'bg-teal-500/12',
    text: 'text-teal-400',
    border: 'border-teal-500/10',
    accent: 'bg-teal-500/8',
    'just-bg': 'bg-teal-500',
  },
] as const;

export function hash_name(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % PALETTES.length;
}

export function get_initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
