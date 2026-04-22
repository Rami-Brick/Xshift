import { useState } from 'react';
import { Home, Users, Calendar } from 'lucide-react';
import { MobileFrame } from './MobileFrame';
import { HomeScreen } from './HomeScreen';
import { RatingScreen } from './RatingScreen';
import { ReportScreen } from './ReportScreen';
import { BottomNavBar } from '../compounds/BottomNavBar';

type TabKey = 'home' | 'people' | 'calendar';

export function App() {
  const [tab, setTab] = useState<TabKey>('home');

  // Home is a full-page responsive dashboard (owns its own nav + layout).
  if (tab === 'home') {
    return (
      <div className="relative">
        <HomeScreen />
        {/* The demo tab-switcher lives outside HomeScreen so visitors can jump
            to the mobile-only preview of the other screens. Hidden on mobile
            where HomeScreen's own pill nav is already visible. */}
        <div className="fixed bottom-6 right-6 hidden md:flex gap-2 rounded-pill bg-navDark px-3 py-2 shadow-nav text-white text-small">
          <button className="px-2 font-medium text-white" onClick={() => setTab('people')}>
            Rating ↗
          </button>
          <span aria-hidden className="opacity-30">|</span>
          <button className="px-2 font-medium text-white" onClick={() => setTab('calendar')}>
            Report ↗
          </button>
        </div>
      </div>
    );
  }

  // Other screens stay mobile-framed for now (out of scope for this pass).
  return (
    <div className="min-h-dvh w-full bg-canvas px-4 py-6">
      <MobileFrame>
        {tab === 'people' && <RatingScreen />}
        {tab === 'calendar' && <ReportScreen />}
        <BottomNavBar<TabKey>
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'home', icon: Home, label: 'Home' },
            { key: 'people', icon: Users, label: 'People' },
            { key: 'calendar', icon: Calendar, label: 'Calendar' },
          ]}
        />
      </MobileFrame>
      <p className="mt-6 text-center text-caption text-muted">
        Workforce HR · Design-Kit Playground · tap the floating nav to switch screens
      </p>
    </div>
  );
}
