# Internationalization (i18n) Setup

This directory contains the internationalization configuration for Donetick.

## Structure

```
src/i18n/
├── config.js           # i18next configuration
└── README.md          # This file

public/locales/
├── en/                # English (default)
│   ├── common.json
│   ├── settings.json
│   └── chores.json
├── es/                # Spanish
├── ar/                # Arabic (RTL)
└── ...
```

## Usage in Components

### Using translations

```jsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation('settings') // or 'common', 'chores'
  
  return <h1>{t('title')}</h1>
}
```

### Using date formatting

```jsx
import { useLocalization } from '@/contexts/LocalizationContext'

function MyComponent() {
  const { formatDate, formatDateTime, formatRelative } = useLocalization()
  
  const date = new Date()
  
  return (
    <div>
      <p>Date: {formatDate(date)}</p>
      <p>DateTime: {formatDateTime(date)}</p>
      <p>Relative: {formatRelative(date)}</p>
    </div>
  )
}
```

### Using language/format settings

```jsx
import { useLocalization } from '@/contexts/LocalizationContext'

function MyComponent() {
  const {
    language,
    setLanguage,
    dateFormat,
    setDateFormat,
    isRTL
  } = useLocalization()
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      Current language: {language}
    </div>
  )
}
```

## Available Namespaces

- **common**: General UI elements (buttons, messages, etc.)
- **settings**: Settings page translations
- **chores**: Chores-related translations

## Adding New Translations

1. Add the text to the appropriate JSON file in `public/locales/en/`
2. Use the translation in your component with `t('key')`
3. Upload to translation platform for community translation

## RTL Support

Languages in the `RTL_LANGUAGES` array automatically get:
- `dir="rtl"` on the document
- RTL-specific CSS styles
- Proper text alignment

Currently supported RTL languages: Arabic (ar), Hebrew (he), Persian (fa), Urdu (ur)

## Date Format Preferences

Users can choose from:
- MM/DD/YYYY (US)
- DD/MM/YYYY (Europe)
- YYYY-MM-DD (ISO)
- Long format (January 1, 2024)
- Short format (Jan 1, 2024)

## Time Format Preferences

- 12-hour (with AM/PM)
- 24-hour

## First Day of Week

Users can choose:
- Sunday
- Monday
