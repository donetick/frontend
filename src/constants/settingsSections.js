import {
  AccountCircle,
  Api,
  Backup,
  Circle,
  Code,
  FamilyRestroom,
  Language,
  Notifications,
  Palette,
  Person,
  PrivacyTip,
  Security,
  Settings,
  Storage,
  ViewSidebar,
} from '@mui/icons-material'

// Single source of truth for the settings sections: id, icon, and access
// gating. Titles/descriptions live in locales/settings.json under
// `overview.sections.<id>`, keyed off the same ids.
// `capability` names an entry in the app-mode capability map (see
// `src/data/appMode.js`); sections whose capability the current mode lacks are
// hidden rather than shown broken.
export const SETTINGS_SECTIONS = [
  { id: 'profile', icon: Person, capability: 'account' },
  { id: 'circle', icon: Circle, parentOnly: true, capability: 'sharing' },
  {
    id: 'account',
    icon: AccountCircle,
    parentOnly: true,
    capability: 'account',
  },
  { id: 'subaccounts', icon: FamilyRestroom, capability: 'members' },
  {
    id: 'notifications',
    icon: Notifications,
    capability: 'notificationProviders',
  },
  { id: 'mfa', icon: Security, parentOnly: true, capability: 'mfa' },
  { id: 'apitokens', icon: Api, parentOnly: true, capability: 'apiTokens' },
  { id: 'backup', icon: Backup, capability: 'backup' },
  { id: 'storage', icon: Storage },
  { id: 'sidepanel', icon: ViewSidebar },
  { id: 'theme', icon: Palette },
  { id: 'localization', icon: Language, isBeta: true },
  { id: 'advanced', icon: Settings },
  { id: 'privacy', icon: PrivacyTip },
  { id: 'developer', icon: Code },
]
