import {
  AccountCircle,
  Api,
  CalendarMonth,
  Circle,
  CloudQueue,
  Code,
  FamilyRestroom,
  Hub,
  Language,
  Link,
  Notifications,
  Palette,
  Person,
  PrivacyTip,
  Security,
  Settings,
  Storage,
  ViewSidebar,
  Webhook,
  Widgets,
} from '@mui/icons-material'

// Routes stay stable; parent identifies the destination's home in settings.
// Shared by the overview, contextual navigation, and global search.
export const SETTINGS_GROUPS = [
  'account',
  'circle',
  'preferences',
  'connections',
  'data',
  'advanced',
]

export const SETTINGS_SECTIONS = [
  { id: 'profile', icon: Person, group: 'account' },
  { id: 'account', icon: AccountCircle, group: 'account', parentOnly: true },
  { id: 'mfa', icon: Security, group: 'account', parentOnly: true },
  { id: 'circle', icon: Circle, group: 'circle', parentOnly: true },
  {
    id: 'subaccounts',
    icon: FamilyRestroom,
    parent: 'circle',
    parentOnly: true,
  },
  { id: 'notifications', icon: Notifications, group: 'preferences' },
  { id: 'theme', icon: Palette, group: 'preferences' },
  { id: 'layout', icon: ViewSidebar, group: 'preferences' },
  { id: 'widgets', icon: Widgets, parent: 'layout', nativeOnly: true },
  { id: 'localization', icon: Language, group: 'preferences', isBeta: true },
  { id: 'integrations', icon: Hub, group: 'connections' },
  { id: 'calendar', icon: CalendarMonth, parent: 'integrations' },
  { id: 'notification-integrations', icon: Link, parent: 'integrations' },
  { id: 'apitokens', icon: Api, parent: 'integrations', parentOnly: true },
  { id: 'webhooks', icon: Webhook, parent: 'integrations', parentOnly: true },
  {
    id: 'bridge',
    icon: CloudQueue,
    group: 'connections',
    parentOnly: true,
    selfHostedOnly: true,
    isBeta: true,
  },
  { id: 'storage', icon: Storage, group: 'data' },
  { id: 'privacy', icon: PrivacyTip, group: 'data' },
  { id: 'advanced', icon: Settings, group: 'advanced' },
  { id: 'developer', icon: Code, parent: 'advanced' },
]

export const getVisibleSettings = ({ isCloud, isNative, isParent }) =>
  SETTINGS_SECTIONS.filter(
    section =>
      (!section.parentOnly || isParent) &&
      (!section.nativeOnly || isNative) &&
      (!section.selfHostedOnly || isCloud === false),
  )
