# Internationalization Implementation Guide

## Overview

This document describes the comprehensive internationalization (i18n) implementation for Donetick, including language support, date format preferences, time format preferences, and right-to-left (RTL) language support.

## Features Implemented

### 1. Multi-Language Support
- ✅ i18next and react-i18next integration
- ✅ Browser language detection
- ✅ Persistent language preference
- ✅ Translation namespaces (common, settings, chores)
- ✅ Sample translations: English, Spanish, Arabic

### 2. Date Format Preferences
- ✅ User-selectable date formats:
  - MM/DD/YYYY (US format)
  - DD/MM/YYYY (European format)
  - YYYY-MM-DD (ISO format)
  - Long format (e.g., January 1, 2024)
  - Short format (e.g., Jan 1, 2024)
- ✅ Live preview of date formats
- ✅ Persistent user preferences

### 3. Time Format Preferences
- ✅ 12-hour format (with AM/PM)
- ✅ 24-hour format
- ✅ Live preview

### 4. RTL (Right-to-Left) Support
- ✅ Automatic RTL layout for Arabic, Hebrew, Persian, Urdu
- ✅ CSS styles for proper RTL rendering
- ✅ Direction attribute on HTML element
- ✅ Text alignment adjustments

### 5. First Day of Week
- ✅ Configurable first day of week (Sunday/Monday)
- ✅ Affects calendar displays

## File Structure

```
donetick-frontend/
├── src/
│   ├── i18n/
│   │   ├── config.js                    # i18next configuration
│   │   └── README.md                    # i18n usage guide
│   ├── contexts/
│   │   └── LocalizationContext.jsx      # Localization context and hooks
│   ├── utils/
│   │   └── DateFormatter.js             # Date formatting utilities
│   └── views/
│       └── Settings/
│           └── LocalizationSettings.jsx  # Settings UI component
├── public/
│   └── locales/
│       ├── en/                          # English translations
│       │   ├── common.json
│       │   ├── settings.json
│       │   └── chores.json
│       ├── es/                          # Spanish translations
│       └── ar/                          # Arabic translations (RTL)
├── crowdin.yml                          # Crowdin configuration
└── TRANSLATION.md                       # Translation management guide
```

## Usage Examples

### 1. Using Translations in Components

```jsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation('settings')
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('localization.description')}</p>
    </div>
  )
}
```

### 2. Using Date Formatting

```jsx
import { useLocalization } from '@/contexts/LocalizationContext'

function MyComponent() {
  const { formatDate, formatDateTime, formatRelative } = useLocalization()
  
  const expirationDate = new Date('2024-12-31')
  
  return (
    <div>
      <p>Expires: {formatDate(expirationDate)}</p>
      <p>Due: {formatRelative(expirationDate)}</p>
    </div>
  )
}
```

### 3. Accessing Localization Settings

```jsx
import { useLocalization } from '@/contexts/LocalizationContext'

function MyComponent() {
  const {
    language,
    setLanguage,
    dateFormat,
    setDateFormat,
    timeFormat,
    setTimeFormat,
    isRTL
  } = useLocalization()
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="ar">العربية</option>
      </select>
    </div>
  )
}
```

### 4. Example: Converting Existing Date Formatting

**Before:**
```jsx
import moment from 'moment'

function SubscriptionInfo({ userProfile }) {
  return (
    <p>
      Subscription expires on {moment(userProfile.expiration).format('MMM DD, YYYY')}
    </p>
  )
}
```

**After:**
```jsx
import { useLocalization } from '@/contexts/LocalizationContext'

function SubscriptionInfo({ userProfile }) {
  const { formatDate } = useLocalization()
  
  return (
    <p>
      Subscription expires on {formatDate(userProfile.expiration)}
    </p>
  )
}
```

## Settings UI

The localization settings are available in:
**Settings → Localization**

Users can configure:
1. **Language**: Select from available languages
2. **Date Format**: Choose how dates are displayed
3. **Time Format**: 12-hour or 24-hour
4. **First Day of Week**: Sunday or Monday

## Available Localization Hooks

### `useLocalization()`

Returns an object with:

```typescript
{
  // Current settings
  language: string,
  dateFormat: string,
  timeFormat: string,
  firstDayOfWeek: number,
  isRTL: boolean,
  availableLanguages: Language[],
  
  // Setters
  setLanguage: (lang: string) => void,
  setDateFormat: (format: string) => void,
  setTimeFormat: (format: string) => void,
  setFirstDayOfWeek: (day: number) => void,
  
  // Formatters
  formatDate: (date: Date | string, format?: string) => string,
  formatDateTime: (date: Date | string, format?: string) => string,
  formatTime: (date: Date | string, format?: string) => string,
  formatRelative: (date: Date | string) => string,
  formatCalendar: (date: Date | string) => string,
}
```

### `useTranslation(namespace)`

From react-i18next:

```typescript
{
  t: (key: string, options?: object) => string,
  i18n: i18n instance,
  ready: boolean,
}
```

## Translation Namespaces

### common.json
General UI elements used throughout the app:
- Buttons (save, cancel, delete, etc.)
- Common actions
- Status messages

### settings.json
All Settings page translations:
- Section titles
- Form labels
- Help text
- Notifications

### chores.json
Chores/tasks related content:
- Task management
- Status labels
- Action buttons

## RTL Languages

The following languages automatically enable RTL layout:
- Arabic (ar)
- Hebrew (he)
- Persian/Farsi (fa)
- Urdu (ur)

RTL features:
- Automatic `dir="rtl"` on HTML element
- Flipped layouts and icons
- Right-aligned text inputs
- Proper border radius handling

## Date Format Constants

Available in `LocalizationContext.jsx`:

```javascript
export const DATE_FORMATS = {
  MDY: 'MM/DD/YYYY',      // 01/15/2024
  DMY: 'DD/MM/YYYY',      // 15/01/2024
  YMD: 'YYYY-MM-DD',      // 2024-01-15
  LONG: 'MMMM D, YYYY',   // January 15, 2024
  SHORT: 'MMM D, YYYY',   // Jan 15, 2024
}

export const TIME_FORMATS = {
  HOUR_12: 'h:mm A',      // 2:30 PM
  HOUR_24: 'HH:mm',       // 14:30
}
```

## Translation Management

### Adding New Languages

1. Create directory: `public/locales/{language-code}/`
2. Copy translation files from `public/locales/en/`
3. Translate content
4. Add language to `AVAILABLE_LANGUAGES` in `LocalizationContext.jsx`
5. If RTL, add to `RTL_LANGUAGES` array

### Using Translation Platforms

See `TRANSLATION.md` for detailed instructions on:
- Setting up Crowdin (recommended)
- Setting up Lokalise
- Setting up POEditor
- Setting up Weblate

### Translation Guidelines

1. Keep placeholders: `{{variable}}`
2. Maintain context awareness
3. Use consistent terminology
4. Test with actual UI
5. Consider character limits
6. Preserve formatting

## Migration Guide

### Converting Components to Use i18n

1. **Add translation hook:**
   ```jsx
   import { useTranslation } from 'react-i18next'
   const { t } = useTranslation('namespace')
   ```

2. **Replace hardcoded strings:**
   ```jsx
   // Before
   <Button>Save</Button>
   
   // After
   <Button>{t('save')}</Button>
   ```

3. **Use localization for dates:**
   ```jsx
   import { useLocalization } from '@/contexts/LocalizationContext'
   const { formatDate } = useLocalization()
   
   // Replace moment().format() with formatDate()
   ```

### Batch Migration Strategy

1. Start with Settings component (already done)
2. Convert common components (buttons, headers)
3. Convert page components
4. Convert utility functions
5. Test each language thoroughly

## Testing

### Testing Translations

1. Change language in Settings → Localization
2. Navigate through the app
3. Check all translated components
4. Verify formatting

### Testing RTL

1. Switch to Arabic or Hebrew
2. Check layout direction
3. Verify icons and navigation
4. Test form inputs

### Testing Date Formats

1. Change date format in Settings
2. Check all date displays update
3. Verify calendar components
4. Test relative dates

## Performance Considerations

- Translations loaded on demand (lazy loading)
- Language detection runs once on init
- Format preferences stored in localStorage
- No re-renders unless language/format changes

## Browser Support

- Modern browsers with ES6+ support
- localStorage support required
- CSS dir attribute support required

## Accessibility

- Proper lang attribute on HTML element
- Screen reader compatible
- RTL support for assistive technologies
- High contrast mode compatible

## Future Enhancements

Potential improvements:
- [ ] Automatic translation via AI
- [ ] Crowdsourced translation interface
- [ ] More granular date format options
- [ ] Regional number formatting
- [ ] Currency formatting
- [ ] Plural rules support
- [ ] Gender-specific translations
- [ ] Translation quality metrics

## Troubleshooting

### Translations not loading
- Check browser console for errors
- Verify JSON files in `public/locales/`
- Check network tab for 404s

### RTL not working
- Verify language in `RTL_LANGUAGES` array
- Check CSS is loaded
- Inspect HTML dir attribute

### Date format not applying
- Check localStorage for saved preferences
- Verify LocalizationContext is mounted
- Check component uses formatDate functions

## Resources

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [Moment.js Formatting](https://momentjs.com/docs/#/displaying/)
- [TRANSLATION.md](./TRANSLATION.md) - Translation management
- [src/i18n/README.md](./src/i18n/README.md) - Quick reference

## Contributors

For questions or contributions related to internationalization:
- Create an issue on GitHub
- Tag with `i18n` or `translation`
- Reference this document

## License

All translations follow the same license as the main project.
