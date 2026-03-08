# Translation Management

This document explains how to manage translations for Donetick using free translation platforms available for open-source projects.

## Translation Structure

Translations are organized in the `/public/locales/{language}/` directory:

```
public/locales/
├── en/
│   ├── common.json      # Common UI elements
│   ├── settings.json    # Settings page translations
│   └── chores.json      # Chores-related translations
├── es/                  # Spanish translations
├── fr/                  # French translations
└── ...
```

## Supported Languages

The application currently supports the following languages:

- English (en) - Default
- Spanish (es)
- French (fr)
- German (de)
- Arabic (ar) - RTL supported
- Hebrew (he) - RTL supported
- Chinese (zh)
- Japanese (ja)
- Portuguese (pt)
- Russian (ru)

## Translation Platforms

### Recommended Platforms (Free for Open Source)

#### 1. Crowdin (Recommended)
**Website:** https://crowdin.com/

**Features:**
- Free for open-source projects
- Easy GitHub integration
- Automatic pull requests
- Translation memory
- Context and screenshots
- Collaborative translation
- Quality assurance checks

**Setup Steps:**
1. Sign up at https://crowdin.com/
2. Create a new project and apply for open-source plan
3. Connect your GitHub repository
4. Upload translation files from `public/locales/en/`
5. Configure the `crowdin.yml` file (see example below)
6. Invite translators or open for community contributions

**crowdin.yml Example:**
```yaml
project_id: "your-project-id"
api_token_env: CROWDIN_API_TOKEN
preserve_hierarchy: true
files:
  - source: /public/locales/en/*.json
    translation: /public/locales/%two_letters_code%/%original_file_name%
```

#### 2. Lokalise
**Website:** https://lokalise.com/

**Features:**
- Free for open-source projects (contact for approval)
- GitHub integration
- Translation memory
- Advanced filtering
- Glossary management
- API access

**Setup Steps:**
1. Sign up at https://lokalise.com/
2. Apply for open-source plan
3. Create a project
4. Upload translation files
5. Set up GitHub integration
6. Configure auto-pull/push

#### 3. POEditor
**Website:** https://poeditor.com/

**Features:**
- Free tier available
- Open-source friendly
- Simple interface
- API access
- GitHub integration
- Translation memory

**Setup Steps:**
1. Sign up at https://poeditor.com/
2. Create a new project
3. Import JSON files from `public/locales/en/`
4. Add languages you want to support
5. Invite contributors
6. Set up GitHub integration for auto-sync

#### 4. Weblate
**Website:** https://weblate.org/

**Features:**
- Completely free for open-source
- Self-hosted or hosted option
- Git integration
- Quality checks
- Translation memory
- Glossary

**Setup Steps:**
1. Go to https://hosted.weblate.org/
2. Sign in with GitHub
3. Add a new component
4. Configure repository access
5. Set file format to JSON
6. Invite translators

## Adding a New Language

1. Create a new directory in `public/locales/` with the language code
2. Copy all JSON files from `public/locales/en/` to the new directory
3. Translate the content
4. Add the language to `AVAILABLE_LANGUAGES` in `src/contexts/LocalizationContext.jsx`
5. If the language is RTL, add it to `RTL_LANGUAGES` array

Example:
```javascript
export const AVAILABLE_LANGUAGES = [
  // ... existing languages
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
]

export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur']
```

## Translation Files

### common.json
Contains general UI elements used across the application:
- Buttons (save, cancel, delete, etc.)
- Common messages
- Navigation items

### settings.json
Contains all text from the Settings page:
- Section titles
- Form labels
- Help text
- Notifications

### chores.json
Contains chores-related translations:
- Task management
- Status labels
- Action buttons

## Contributing Translations

### For Translators

1. **Via Translation Platform:**
   - Visit our project on [Platform Name]
   - Sign up and request access
   - Select a language you want to contribute to
   - Start translating!

2. **Via GitHub (Direct):**
   - Fork the repository
   - Create a new branch: `git checkout -b translation/language-code`
   - Add your translations to `public/locales/{language}/`
   - Submit a pull request

### Translation Guidelines

1. **Keep formatting:** Preserve placeholders like `{{variable}}`
2. **Context matters:** Consider the UI context when translating
3. **Be consistent:** Use the same terminology throughout
4. **Character limits:** Some UI elements have space constraints
5. **Test your translations:** If possible, test in the actual application
6. **RTL languages:** Ensure proper text direction is maintained

## Testing Translations

To test translations locally:

1. Add your translation files to `public/locales/{language}/`
2. Start the development server: `npm run dev`
3. Change language in Settings → Localization
4. Navigate through the app to verify translations

## CI/CD Integration

### GitHub Actions for Crowdin

Create `.github/workflows/crowdin.yml`:

```yaml
name: Crowdin Sync

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: crowdin/github-action@v1
        with:
          upload_sources: true
          upload_translations: false
          download_translations: true
          create_pull_request: true
        env:
          CROWDIN_PROJECT_ID: ${{ secrets.CROWDIN_PROJECT_ID }}
          CROWDIN_PERSONAL_TOKEN: ${{ secrets.CROWDIN_PERSONAL_TOKEN }}
```

## Translation Coverage

Track translation progress:
- Use platform analytics to monitor completion
- Set up automated reports
- Create issues for missing translations

## Questions?

For translation-related questions:
- Create an issue on GitHub
- Contact the maintainers
- Join our community discussions

## License

All translations are subject to the same license as the main project.
