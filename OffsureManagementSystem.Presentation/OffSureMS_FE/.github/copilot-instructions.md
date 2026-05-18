# TaskManagement Frontend - AI Coding Instructions

## Project Overview
**Spruha** is an Angular 19 B2B task management dashboard application with multi-language support (AR/EN), built on a modern architecture combining NgRx state management, Firebase integration, and a comprehensive component library.

## Architecture & Structure

### State Management (NgRx)
- **Location**: `src/app/store/`
- **Pattern**: Feature-based state with `auth` and `nav` modules
- **Key files**: 
  - `app.state.ts` - Root state interface
  - `auth/` - Authentication state (user, token, loading, error)
  - `auth.reducer.ts` - Handles login/logout/success/failure actions
  - `auth.effects.ts` - Side effects for API calls
- **Pattern**: Actions trigger effects, effects call services, reducers update state
- Example: Login flow: `AuthActions.login` → `AuthEffects` → API call → `loginSuccess` → reducer updates state

### Service Architecture
- **Location**: `src/app/core/services/`
- **Base Service**: `ApiService` - Generic HTTP wrapper with `serviceName` property for URL routing
  - Methods: `get<T>()`, `post<T>()`, `put<T>()`, `delete<T>()`, `patch<T>()`
  - Constructs URLs as: `${baseUrl}/${serviceName}/${endpoint}`
- **Pattern**: Domain services (AreaService, BranchService) extend ApiService, set `serviceName`
- **Configuration**: Base URL from `environment.ts` (default: `https://localhost:7115/api`)

### Component Organization
- **Shared Components**: `src/app/shared/components/`
  - `GenericTableComponent` - Reusable data table with filtering, export, sorting, selection
  - `GenericFormComponent` - Standalone form builder with dynamic field configs
  - `PageHeaderComponent` - Page title/breadcrumb wrapper
  - Layouts: FullLayout, ContentLayout, MessageLayout, ErrorLayout
- **Layout Pattern**: Page components wrap content in layout components from shared module

### Module System (Mixed Approach)
- **NgModule**: `app.module.ts` handles root configuration (Store, Effects, Http, Translate)
- **Standalone Components**: `app.component.ts`, `GenericFormComponent` use `standalone: true`
- **Shared Module**: `shared.module.ts` bundles common directives, components, pipes

## Key Patterns & Conventions

### API Integration
1. Create service inheriting `ApiService`: `constructor(private api: ApiService) { this.api.serviceName = 'areas'; }`
2. Inject into components or effects
3. Subscribe in effects or component (RxJS patterns)

### NgRx Store Usage
- **Selectors**: Access state via `store.select(selectAuthUser)`
- **Dispatch**: `store.dispatch(AuthActions.login(credentials))`
- **Effects**: Use `switchMap` for sequential operations, `tap` for side effects
- **Error handling**: Actions like `loginFailure` capture and emit error state

### Form Handling
- **GenericFormComponent**: Pass `formConfig` array with field definitions, emit `formSubmit` event
- **Reactive Forms**: `FormBuilder` for dynamic form creation with validations
- **Validation**: `Validators.required`, `minLength`, `maxLength` in FormControls

### Table/List Patterns
- **GenericTableComponent**: Configure with `columns`, `title`, `showFilters`, `showCheckbox`, `searchCriteria`
- **Export**: `exportExcel()` method available on component
- **Sorting**: Click table headers to sort (via `NgbdSortableHeader` directive)
- **Filtering**: Dynamic filter UI based on `filterTypes` in search criteria

### Internationalization
- **Translation Service**: `TranslateModule` with HTTP loader from `assets/i18n/` (ar.json, en.json)
- **Pipe Usage**: `{{ 'KEY.SUBKEY' | translate }}`
- **Service**: `TranslationConfigService` manages language setup

### Styling
- **Preprocessor**: SASS (compiled from `public/assets/scss/` → `public/assets/css/`)
- **Build Command**: `npm run sass` or `npm run sass-min` (minified)
- **Framework**: Bootstrap 5 with component-level `.scss` files
- **Global Styles**: `src/styles.scss` and `src/index.css`

## Build & Development Commands

```bash
npm install              # Install dependencies
npm start               # Development: ng serve (localhost:4200)
npm run build          # Production build → dist/b2b/
npm run watch          # Watch mode for development
npm test               # Unit tests (Karma/Jasmine)
npm run sass           # Compile SCSS
npm run sass-min       # Compile SCSS (minified)
```

## Firebase Configuration
- **Setup**: `AngularFireModule` in `app.config.ts`
- **Modules**: Authentication, Realtime Database, Firestore available
- **Config**: Credentials in `environment.ts`
- **Used for**: Authentication, data persistence (optional based on feature)

## Key Dependencies & Versions
- **Angular**: 19.2.0 (latest - App Router v19)
- **NgRx**: 19.0.1 (state management)
- **ngx-translate**: 16.0.4 (i18n)
- **ng-bootstrap**: 18.0.0 (Bootstrap components)
- **ApexCharts**: 4.4.0 (charting)
- **Firebase**: AngularFire compat mode
- **Testing**: Karma + Jasmine

## Component Naming & File Structure
- **Components**: `component-name/component-name.component.ts/html/scss`
- **Services**: `service-name.service.ts`
- **Models**: `src/app/models/` (interfaces and types)
- **Directives**: `src/app/shared/directives/` (e.g., `sortable.directive.ts`)

## Testing Strategy
- **Unit Tests**: `ng test` (tests skipped by default in schematics - configure in `angular.json`)
- **E2E**: `ng e2e` (framework not included - add Cypress/Playwright if needed)
- **Current Status**: No tests configured; focus on manual testing during development

## Common Gotchas
1. **Service Names**: Must set `serviceName` property before API calls in service constructors
2. **Store State**: Always import specific selectors from store modules, not root state
3. **Standalone vs NgModule**: New components are standalone; shared module is deprecated for new additions
4. **Translation Keys**: Must exist in both `en.json` and `ar.json` before use in templates
5. **Proxy**: `proxy.conf.json` available for local development API routing

## File Locations for Quick Reference
- **Routes**: `src/app/app-routing.module.ts` and `src/app/app.routes.ts`
- **Environment Config**: `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod)
- **Global i18n**: `src/assets/i18n/` (ar.json, en.json)
- **Icon Fonts**: `src/assets/icon-fonts/` (FontAwesome, Bootstrap Icons, etc.)
- **API Types**: `src/app/models/` (request/response DTOs)
