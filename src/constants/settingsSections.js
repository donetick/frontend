import {
  AccountCircle,
  Api,
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
export const SETTINGS_SECTIONS = [
  { id: 'profile', icon: Person },
  { id: 'circle', icon: Circle, parentOnly: true },
  { id: 'account', icon: AccountCircle, parentOnly: true },
  { id: 'subaccounts', icon: FamilyRestroom },
  { id: 'notifications', icon: Notifications },
  { id: 'mfa', icon: Security, parentOnly: true },
  { id: 'apitokens', icon: Api, parentOnly: true },
  { id: 'storage', icon: Storage },
  { id: 'sidepanel', icon: ViewSidebar },
  { id: 'theme', icon: Palette },
  { id: 'localization', icon: Language, isBeta: true },
  { id: 'advanced', icon: Settings },
  { id: 'privacy', icon: PrivacyTip },
  { id: 'developer', icon: Code },
]
