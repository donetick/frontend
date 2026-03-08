# i18n Quick Reference

## Common Imports

```jsx
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/contexts/LocalizationContext'
```

## Translation Hook

```jsx
const { t } = useTranslation('namespace')

// Usage
<h1>{t('title')}</h1>
<p>{t('section.description')}</p>
```

**Namespaces**: `common`, `settings`, `chores`

## Date Formatting Hook

```jsx
const { formatDate, formatDateTime, formatTime, formatRelative } = useLocalization()

// Usage
<p>{formatDate(date)}</p>                    // Uses user's preferred format
<p>{formatDateTime(date)}</p>                // Date + time
<p>{formatTime(date)}</p>                    // Time only
<p>{formatRelative(date)}</p>                // "2 hours ago"
```

## Language/Format Settings

```jsx
const {
  language,           // Current language code
  setLanguage,        // Change language
  dateFormat,         // Current date format
  setDateFormat,      // Change date format
  timeFormat,         // Current time format
  setTimeFormat,      // Change time format
  isRTL              // Is current language RTL?
} = useLocalization()
```

## Adding Translations

### 1. Add to JSON
`public/locales/en/settings.json`:
```json
{
  "mySection": {
    "title": "My Section",
    "description": "Section description"
  }
}
```

### 2. Use in Component
```jsx
const { t } = useTranslation('settings')
<h1>{t('mySection.title')}</h1>
```

## Date Format Migration

### Before
```jsx
moment(date).format('MMM DD, YYYY')
```

### After
```jsx
const { formatDate } = useLocalization()
formatDate(date)
```

## Available Date Formats

- `MM/DD/YYYY` - 01/15/2024
- `DD/MM/YYYY` - 15/01/2024
- `YYYY-MM-DD` - 2024-01-15
- `MMMM D, YYYY` - January 15, 2024
- `MMM D, YYYY` - Jan 15, 2024

## RTL Languages

Automatically supported: `ar`, `he`, `fa`, `ur`

## File Locations

- **Translations**: `public/locales/{lang}/*.json`
- **Config**: `src/i18n/config.js`
- **Context**: `src/contexts/LocalizationContext.jsx`
- **Settings UI**: `src/views/Settings/LocalizationSettings.jsx`

## Translation Namespaces

| Namespace | Purpose | Example Keys |
|-----------|---------|--------------|
| common | General UI | save, cancel, delete, edit |
| settings | Settings page | title, localization.*, theme.* |
| chores | Tasks/Chores | myChores, addChore, dueDate |

## Quick Examples

### Button with Translation
```jsx
const { t } = useTranslation('common')
<Button>{t('save')}</Button>
```

### Date Display
```jsx
const { formatDate } = useLocalization()
<p>Due: {formatDate(task.dueDate)}</p>
```

### RTL-Aware Layout
```jsx
const { isRTL } = useLocalization()
<div dir={isRTL ? 'rtl' : 'ltr'}>Content</div>
```

### Language Selector
```jsx
const { language, setLanguage, availableLanguages } = useLocalization()

<select value={language} onChange={e => setLanguage(e.target.value)}>
  {availableLanguages.map(lang => (
    <option key={lang.code} value={lang.code}>
      {lang.nativeName}
    </option>
  ))}
</select>
```

## Testing Locally

1. Go to Settings → Localization
2. Change language to Spanish
3. Verify translations appear
4. Change date format
5. Verify dates update throughout app

## Common Patterns

### Page Title
```jsx
const { t } = useTranslation('settings')
<Typography level='h3'>{t('title')}</Typography>
```

### Form Label
```jsx
const { t } = useTranslation('settings')
<FormLabel>{t('localization.language')}</FormLabel>
```

### Date in Text
```jsx
const { formatDate } = useLocalization()
<p>Your subscription expires on {formatDate(expiration)}.</p>
```

### Relative Time
```jsx
const { formatRelative } = useLocalization()
<p>Updated {formatRelative(lastUpdate)}</p>
```

## Documentation

- **Full Guide**: I18N_IMPLEMENTATION.md
- **Translation Setup**: TRANSLATION.md
- **Summary**: INTERNATIONALIZATION_SUMMARY.md
