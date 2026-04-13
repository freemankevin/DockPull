# AI Coding Standards

## File Size Limit
- **Maximum 400 lines per file** - Any file exceeding this limit must be split into submodules
- When a file approaches 300+ lines, proactively consider splitting it

## Module Splitting Guidelines

### Frontend (TypeScript/React)
- Extract reusable components to `src/components/`
- Extract utility functions to `src/utils/`
- Extract constants to `src/constants/`
- Extract types to `src/types/`
- For page components, split into sub-components under `src/pages/<page>/`

### Backend (Go)
- Split handlers by domain (e.g., `image_handler.go`, `config_handler.go`)
- Split database operations by entity (e.g., `image_db.go`, `settings_db.go`)
- Keep initialization logic in the main file

## Code Organization

### Directory Structure
```
src/
  components/     # Shared UI components
  constants/      # Static configuration and constants
  hooks/          # Custom React hooks
  pages/          # Page components (can have subdirectories)
  types/          # TypeScript type definitions
  utils/          # Utility functions
  context/        # React context providers
  api/            # API client functions

app/internal/
  handler/        # HTTP handlers (split by domain)
  database/       # Database operations (split by entity)
  service/        # Business logic services
  models/         # Data models
  config/         # Configuration
  middleware/     # HTTP middleware
```

### Naming Conventions
- **Components**: PascalCase (e.g., `ImageModal.tsx`)
- **Utilities**: camelCase (e.g., `imageUtils.ts`)
- **Constants**: camelCase with descriptive names (e.g., `settings.ts`, `logs.ts`)
- **Go files**: snake_case (e.g., `image_handler.go`)

## When to Split a File

### Signs that a file needs splitting:
1. File exceeds 400 lines
2. Multiple distinct concerns in one file
3. Repeated patterns that could be extracted
4. Complex conditional logic that obscures main flow
5. Mixed UI components and business logic

### How to split:
1. Identify distinct logical sections
2. Create separate files for each concern
3. Export from sub-modules and import in main file
4. Ensure each file has a single, clear responsibility
5. Keep related functionality together

## Example Split Patterns

### React Component Split
```
Before: Settings.tsx (690 lines)
After:
  Settings.tsx (200 lines - main orchestration)
  components/SettingRow.tsx
  constants/settings.ts
  pages/settings/ExportSettings.tsx
  pages/settings/AccountSettings.tsx
  pages/settings/RetrySettings.tsx
  pages/settings/TokenSettings.tsx
  pages/settings/WebhookSettings.tsx
```

### Go Handler Split
```
Before: handler.go (467 lines)
After:
  handler.go (35 lines - struct definition)
  image_handler.go (180 lines)
  config_handler.go (90 lines)
  browse_handler.go (170 lines)
```

## Quality Checklist
- [ ] No file exceeds 400 lines
- [ ] Each file has single responsibility
- [ ] Imports are organized and minimal
- [ ] Exports are clear and documented
- [ ] No code duplication across files
- [ ] Tests are updated if applicable