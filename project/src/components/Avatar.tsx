import { getAvatarColor, getInitials } from '@/lib/utils';
import type { Profile } from '@/types';
export function Avatar({ profile, size = 'md' }: { profile?: Profile | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-14 h-14 text-lg' };
  if (!profile) return <div className={`${sizes[size]} rounded-full bg-dark-200 shrink-0`} />;
  if (profile.avatar_url) return <img src={profile.avatar_url} alt={profile.display_name} className={`${sizes[size]} rounded-full object-cover shrink-0`} />;
  return <div className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0`} style={{ backgroundColor: getAvatarColor(profile.id) }}>{getInitials(profile.display_name)}</div>;
}
