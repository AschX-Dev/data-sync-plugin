# Data Sync Plugin for DHIS2

A **DHIS2 Form Field Plugin** for the Tracker Capture (Capture App) that lets data entry operators look up a youth enterprise by its unique ID and automatically pre-fill aggregated demographic participant counts — eliminating manual tallying and reducing data entry errors.

---

## ✨ Features

- 🔍 **Enterprise Lookup** — search the DHIS2 tracker by Enterprise Unique ID
- 📊 **Auto-fill Counts** — automatically populates 11 demographic aggregate fields in the active Capture form
- 👥 **Youth-scoped** — only counts Tracked Entity Instances aged 15–35 (configurable)
- 🏷️ **Category Breakdowns** — disaggregates by sex, IDP, PWD, refugee, and returnee status
- 🔒 **Dev-mode safe** — guards `setFieldValue` calls so the plugin doesn't crash outside DHIS2
- 🪵 **Debug logging** — all steps prefixed `[EnterpriseCount]` for easy DevTools filtering

---

## 🗂️ Project Structure

```
src/
├── Plugin.tsx                          # Root plugin component (entry point for DHIS2)
├── Plugin.types.ts                     # TypeScript interfaces for DHIS2 plugin props
└── Components/
    ├── ExternalSourceForm/
    │   ├── ExternalSourceForm.tsx      # Enterprise ID search UI and result display
    │   ├── useExternalData.ts          # Core logic: event fetch → TEI lookup → count calculation → field fill
    │   └── index.ts                    # Barrel export
    └── PluginDetails/
        ├── PluginDetails.tsx           # Diagnostic view (fieldsMetadata / values inspector)
        └── index.ts
```

---

## ⚙️ How It Works

```
Operator types an Enterprise Unique ID → clicks Search
        ↓
Plugin fetches all events in the Youth Status programme stage
        ↓
Events are filtered by the Enterprise ID data element
        ↓
Unique Tracked Entity UIDs are extracted from matched events
        ↓
Each TEI's full attribute profile is fetched individually
        ↓
Youth filter applied (age 15–35 from Date of Birth attribute)
        ↓
Demographic counts computed (sex, IDP, PWD, refugee, returnee)
        ↓
setFieldValue() auto-fills all 11 aggregate fields in the form
        ↓
Success notice confirms total youth participants found
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| DHIS2 instance | v40+ |
| [Tracker Plugin Configurator](https://apps.dhis2.org/app/85d156b7-6e3f-43f0-be57-395449393f7d) | installed |
| Node.js | ≥ 18 |
| Yarn | any |

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd data-sync-plugin
   yarn install
   ```

2. Start the development server (also compiles Tailwind CSS in watch mode):
   ```bash
   yarn start
   ```

3. Build for production:
   ```bash
   yarn build
   ```

4. Upload the generated `.zip` from the `build/` directory to your DHIS2 instance via **App Management**.

---

## 🔧 Configuration

All hardcoded UIDs live at the top of `src/Components/ExternalSourceForm/useExternalData.ts`. Update these to match your DHIS2 instance before deploying.

### Step 1 — Programme & Stage UIDs

```ts
const PROGRAM_UID            = 'YdLl8aLY91v';  // Your Youth programme UID
const YOUTH_STATUS_STAGE_UID = 'yvHS9FuVRvA';  // Programme stage UID
const ENTERPRISE_DE          = 'TlsDM3P677Z';  // Enterprise ID data element UID
```

> Find these in **DHIS2 → Maintenance → Programs** and **Program Stages**.

### Step 2 — Tracked Entity Attribute UIDs

```ts
const SEX_ATTR_UID      = 'UuarYVu1ga2';  // Sex / Gender attribute
const DOB_ATTR_UID      = 'CoBkeZU3pGi';  // Date of Birth attribute
const IDP_ATTR_UID      = 'NZ5I8At04Qv';  // IDP (boolean) attribute
const PWD_ATTR_UID      = 'xOJ8s05UAXV';  // PWD (boolean) attribute
const REFUGEE_ATTR_UID  = 'GZOhLCUakHR';  // Refugee (boolean) attribute
const RETURNEE_ATTR_UID = 'LVPx2XDOwrK';  // Returnee (boolean) attribute
```

> Find attribute UIDs in **DHIS2 → Maintenance → Tracked Entity Attributes**.

### Step 3 — Configure Plugin Aliases in Tracker Plugin Configurator

Map your Tracked Entity Attributes to the following **exact** plugin aliases in the Tracker Plugin Configurator app. These must match the keys in `FIELD_MAP`:

| Plugin Alias | Description |
|---|---|
| `totalgroupmembers` | Total youth participants (15–35) |
| `femaleyouth` | Female youth count |
| `maleyouth` | Male youth count |
| `idp` | Total IDPs (youth only) |
| `idpfemale` | Female IDPs |
| `idpmale` | Male IDPs |
| `pwd` | Total PWDs (youth only) |
| `pwdfemale` | Female PWDs |
| `pwdmale` | Male PWDs |
| `refugee` | Total refugees (youth only) |
| `returnee` | Total returnees (youth only) |

> ⚠️ All 11 aliases must match exactly. The plugin calls `setFieldValue` for each one; mismatched alias names will throw `"fieldId must be one of the configured plugin ids"`.

### Step 4 — Youth Age Range (Optional)

The youth filter is defined inline in `calculateCounts` in `useExternalData.ts`:

```ts
const isYouth = age !== null && age >= 15 && age <= 35;
```

Adjust the bounds to match your programme's definition of "youth".

---

## 📋 Computed Fields Reference

| Field Alias | Computation Logic |
|---|---|
| `totalgroupmembers` | All TEIs where `isYouth === true` |
| `femaleyouth` | Youth where `sex === 'Female'` |
| `maleyouth` | Youth where `sex === 'Male'` |
| `idp` | Youth where IDP attribute is truthy |
| `idpfemale` | `idp && isFemale` |
| `idpmale` | `idp && isMale` |
| `pwd` | Youth where PWD attribute is truthy |
| `pwdfemale` | `pwd && isFemale` |
| `pwdmale` | `pwd && isMale` |
| `refugee` | Youth where refugee attribute is truthy |
| `returnee` | Youth where returnee attribute is truthy |

**Boolean attribute matching** — the following stored values are all treated as `true`:
`true`, `yes`, `1`, `y`, `on` (case-insensitive).

---

## 🏗️ DHIS2 Plugin Props

The plugin receives the following props from the DHIS2 Capture App at runtime:

| Prop | Type | Description |
|---|---|---|
| `setFieldValue` | `({ fieldId, value, options? }) => void` | Fills a form field by its plugin alias |
| `fieldsMetadata` | `Record<string, FieldMeta>` | Metadata for all configured plugin fields |
| `values` | `Record<string, any>` | Current form field values |
| `errors` | `Record<string, string[]>` | Current field validation errors |
| `warnings` | `Record<string, string[]>` | Current field validation warnings |
| `formSubmitted` | `boolean` | Whether the form has been submitted |
| `setContextFieldValue` | `({ fieldId, value }) => void` | Sets context fields: `geometry`, `occurredAt`, `enrolledAt` |
| `programId` | `string?` | Active programme UID (injected by Capture) |
| `orgUnitId` | `string?` | Active organisation unit UID (injected by Capture) |

---

## 🪵 Debugging

All plugin logs are prefixed `[EnterpriseCount]`. Open browser DevTools and filter by this prefix to trace execution:

| Log Message | Meaning |
|---|---|
| `▶ Search — enterprise="..."` | Search initiated |
| `◀ Step 1 — N events \| filtering for "..."` | Events fetched; filtering started |
| `N events matched` | Events linked to the given enterprise ID |
| `N unique TEIs` | Deduplicated tracked entity UIDs |
| `▶ Step 2 — fetching N TEIs` | Individual profile fetch started |
| `◀ Step 2 complete — N/M loaded` | How many TEI profiles were resolved |
| `✅ Final counts: {...}` | Full breakdown of computed counts |
| `❌ Failed TEI <uid>` | A single TEI fetch failed (non-fatal) |
| `❌ Events fetch failed` | The initial events query failed |

---

## ⚠️ Important Notes

- **Page size** — the events query fetches up to `2000` events per call (`ouMode: ALL`). For very large programmes, consider implementing pagination via the `page` query parameter.
- **`setFieldValue` alias constraints** — only alias names configured in Tracker Plugin Configurator are accepted. Passing a raw UID will throw an error.
- **Dual entry point** — `d2.config.js` registers the plugin under both `app` and `plugin` entry points so the module works both as a standalone dev app and as an embedded Capture plugin.
- **Tailwind CSS** — the project uses Tailwind v3 compiled to `src/tailwind.css`. The `yarn start` command runs the Tailwind watcher alongside the DHIS2 dev server automatically.

---

## 📄 License

BSD-3-Clause © Data Sync Plugin Contributors
