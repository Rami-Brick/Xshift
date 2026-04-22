import { AppHeader } from '@/design-kit/compounds/AppHeader';
import type { Profile } from '@/types';

interface EmployeeHeaderProps {
  profile: Profile;
}

export function EmployeeHeader({ profile }: EmployeeHeaderProps) {
  const firstName = profile.full_name.split(' ')[0];

  return (
    <AppHeader
      variant="dashboard"
      eyebrow="Xshift"
      title={`Bonjour, ${firstName}`}
      avatarName={profile.full_name}
    />
  );
}
