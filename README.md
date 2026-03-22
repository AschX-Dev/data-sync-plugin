# 🏥 Civil Registry Plugin for DHIS2

A **DHIS2 Form Field Plugin** that enables data entry operators to look up patients by their National/patient ID and automatically pre-fill tracked entity attributes in the Tracker Capture (Capture App) form — reducing manual entry errors and improving data quality.

---

## ✨ Features

- 🔍 **Patient Lookup** — search for an existing Tracked Entity Instance (TEI) by Patient/National ID
- ⚡ **Auto-fill** — automatically populates First Name and Last Name into the active Tracker form
- 🛡️ **Alias-safe** — only fills fields configured as plugin aliases; all other attributes are silently ignored
- 🪵 **Debug logging** — detailed `[CivilRegistry]` console logs for every step of the lookup and fill flow
- 🔒 **Dev-mode safe** — guards `setFieldValue` calls so the plugin doesn't crash when run outside DHIS2

---

## 🗂️ Project Structure

```
src/
├── Plugin.tsx                          # Root plugin component (receives DHIS2 props)
├── Plugin.types.ts                     # TypeScript types for DHIS2 plugin props
├── Components/
│   ├── ExternalSourceForm/
│   │   ├── ExternalSourceForm.tsx      # patient ID search UI
│   │   ├── useExternalData.ts          # TEI fetch + alias mapping + setFieldValue logic
│   │   └── index.ts
│   └── PluginDetails/
│       ├── PluginDetails.tsx           # Diagnostic view: shows raw fieldsMetadata/values
│       └── index.ts
```

---

## ⚙️ How It Works

```
User opens Capture App form
        ↓
Plugin renders inside the form (DHIS2 Field Plugin)
        ↓
Operator types a patient ID → clicks Search
        ↓
Plugin calls DHIS2 trackedEntityInstances API
        ↓
Attribute UIDs in the response are mapped to plugin aliases
        ↓
setFieldValue() fills firstName, lastName, patientId in the form
        ↓
Operator reviews and submits the pre-filled form
```

---

## 🚀 Getting Started

### Prerequisites

- DHIS2 instance (v40+)
- [Tracker Plugin Configurator](https://apps.dhis2.org/app/85d156b7-6e3f-43f0-be57-395449393f7d) installed
- Node.js ≥ 18 and Yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd civil-registry-plugin
   yarn install
   ```

2. Start the development server:
   ```bash
   yarn start
   ```

3. Build for production:
   ```bash
   yarn build
   ```

4. Upload the built `.zip` from `build/` to your DHIS2 instance via **App Management**.

---

## 🔧 Configuration

### Step 1 — Map Your DHIS2 Attribute UIDs

Open `src/Components/ExternalSourceForm/useExternalData.ts` and populate the `ATTRIBUTE_UID_TO_ALIAS` map with your **real DHIS2 attribute UIDs**:

```ts
const ATTRIBUTE_UID_TO_ALIAS: Record<string, 'patientId' | 'firstName' | 'lastName'> = {
    'MWaTKqE7ZvR': 'patientId',   // National ID attribute UID
    'KXDOx8W4Wzwi': 'firstName',  // First Name attribute UID
    'Y8ku500FYhK':  'lastName',   // Last Name attribute UID
};
```

> Find your attribute UIDs in **DHIS2 → Maintenance → Tracked Entity Attributes**.

Also update the API filter UID in the `fetchTEI` function to use your National ID attribute UID:

```ts
const url = `/api/trackedEntityInstances.json?filter=<YOUR_NATIONAL_ID_UID>:EQ:${patientId}...`;
```

### Step 2 — Configure Aliases in Tracker Plugin Configurator

In the Tracker Plugin Configurator app, map your tracked entity attributes to the following **exact** plugin aliases:

| Tracked Entity Attribute | Plugin Alias  | Type |
|--------------------------|---------------|------|
| Patient / National ID    | `patientId`   | Text |
| First Name               | `firstName`   | Text |
| Last Name                | `lastName`    | Text |

> ⚠️ **Only these three aliases are allowed.** The plugin will ignore all other attributes (gender, date of birth, etc.) even if they exist on the TEI.

### Step 3 — Optional: Filter by Program

If your TEIs must be scoped to a specific program, add the program UID to the API URL:

```ts
const url = `/api/trackedEntityInstances.json?program=<PROGRAM_UID>&filter=...`;
```

---

## 🪵 Debugging

All plugin logs are prefixed with `[CivilRegistry]`. Open your browser DevTools console and filter by this prefix to trace:

| Log | Meaning |
|-----|---------|
| `Fetching TEI for patientId: ...` | API call initiated |
| `Raw DHIS2 TEI response: ...` | Full raw API response |
| `TEIs found: N` | How many records matched |
| `UID="..." → alias="..."` | Mapping result for each attribute |
| `Skipping alias "..." — not in allowed list` | Attribute was mapped but not allowed (e.g. gender) |
| `✅ setFieldValue({ fieldId: "...", value: "..." })` | Field successfully filled |
| `setFieldValue is not a function` | Running outside DHIS2 (dev/standalone mode) |

---

## 🏗️ DHIS2 Plugin Props

The plugin receives the following props from the DHIS2 Capture App:

| Prop | Type | Description |
|------|------|-------------|
| `setFieldValue` | `(fieldId, value) => void` | Fills a form field by its plugin alias |
| `fieldsMetadata` | `Record<string, FieldMeta>` | Metadata for all configured fields |
| `values` | `Record<string, any>` | Current form field values |
| `errors` | `Record<string, string[]>` | Current field validation errors |
| `warnings` | `Record<string, string[]>` | Current field validation warnings |
| `formSubmitted` | `boolean` | Whether the form has been submitted |
| `setContextFieldValue` | `(fieldId, value) => void` | Sets context fields: `geometry`, `occurredAt`, `enrolledAt` |

---

## ⚠️ Important Notes

- `setFieldValue` only accepts `fieldId` values that match aliases **configured in Tracker Plugin Configurator**. Passing a raw UID (e.g. `KXDOx8W4Wzwi`) will throw: `"fieldId must be one of the configured plugin ids"`.
- If you add or remove aliases in the Configurator, update `ATTRIBUTE_UID_TO_ALIAS` and `ALLOWED_ALIASES` accordingly.
- For production use, consider routing the DHIS2 API call through a proxy server rather than calling it directly from the browser.

---

## 📄 License

BSD-3-Clause © Civil Registry Plugin Contributors
