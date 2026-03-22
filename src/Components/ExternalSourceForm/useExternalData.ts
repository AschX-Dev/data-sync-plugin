import { useDataQuery } from "@dhis2/app-runtime";
import { SetFieldValueProps } from "../../Plugin.types";

type Props = {
    setFieldValue: (values: SetFieldValueProps) => void;
    orgUnitId?: string;
}

// ──────────────────────────────────────────────
// Configuration — update these if UIDs change
// ──────────────────────────────────────────────

/** Program UID for the civil registry / patient programme */
const PROGRAM_UID = 'zmgIkpgIW1I';

/** National ID attribute UID — used as the search filter */
const PATIENT_ID_ATTR_UID = 'MWaTKqE7ZvR';

/**
 * Maps TEI attribute UIDs → plugin field aliases.
 * Aliases MUST match what is configured in Tracker Plugin Configurator.
 */
const ATTRIBUTE_UID_TO_ALIAS: Record<string, 'patientId' | 'firstName' | 'lastName'> = {
    'MWaTKqE7ZvR': 'patientId',
    'KXDOx8W4Wzw': 'firstName',
    'Y8ku500FYhK': 'lastName',
};

/** Only these aliases may be passed to setFieldValue */
const ALLOWED_ALIASES = new Set<string>(['patientId', 'firstName', 'lastName']);

// ──────────────────────────────────────────────
// Query
// ──────────────────────────────────────────────

const TEI_QUERY = {
    tei: {
        resource: 'tracker/trackedEntities',
        params: ({
            patientId,
            orgUnitId,
        }: {
            patientId: string;
            orgUnitId?: string;
        }) => {
            const params: Record<string, string | number> = {
                program: PROGRAM_UID,
                filter: `${PATIENT_ID_ATTR_UID}:EQ:${patientId}`,
                fields: 'trackedEntity,attributes[attribute,value]',
                pageSize: 1,
                ouMode: 'ALL',
            };

            if (orgUnitId) {
                params.orgUnit = orgUnitId;
            }

            console.debug('[CivilRegistry] Final query params:', params);
            return params;
        },
    },
};

// ──────────────────────────────────────────────
// Auto-fill handler
// ──────────────────────────────────────────────

const handleFill = (
    data: any,
    setFieldValue: (values: SetFieldValueProps) => void
) => {
    // Direct API returns `trackedEntities`, not `instances`
    const instances = data?.tei?.trackedEntities ?? [];
    console.debug('[CivilRegistry] Raw response:', JSON.stringify(data?.tei, null, 2));
    console.debug(`[CivilRegistry] TEIs found: ${instances.length}`);

    if (instances.length === 0) {
        console.warn('[CivilRegistry] No TEI found for the given patientId.');
        return;
    }

    const fetchedAttrs: Array<{ attribute: string; value: string }> =
        instances[0].attributes ?? [];

    console.debug('[CivilRegistry] Fetched attributes:', fetchedAttrs);

    fetchedAttrs.forEach(({ attribute, value }) => {
        const alias = ATTRIBUTE_UID_TO_ALIAS[attribute];
        console.debug(
            `[CivilRegistry] UID="${attribute}" → alias="${alias ?? '(not mapped)'}" value="${value}"`
        );

        if (!alias) return;

        if (!ALLOWED_ALIASES.has(alias)) {
            console.debug(`[CivilRegistry] Skipping "${alias}" — not in allowed list`);
            return;
        }

        if (typeof setFieldValue !== 'function') {
            console.warn('[CivilRegistry] setFieldValue is not a function — skipping (dev mode?)');
            return;
        }

        console.debug(`[CivilRegistry] ✅ setFieldValue({ fieldId: "${alias}", value: "${value}" })`);
        setFieldValue({ fieldId: alias, value });
    });
};

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export const useExternalData = ({ setFieldValue, orgUnitId }: Props) => {
    const { loading: isLoading, error: fetchError, refetch } = useDataQuery(
        TEI_QUERY,
        {
            lazy: true,
            onComplete: (data) => handleFill(data, setFieldValue),
            onError: (error) => console.error('[CivilRegistry] Failed to fetch TEI:', error),
        }
    );

    const mutate = ({ patientId }: { patientId: string }) => {
        if (!patientId.trim()) {
            console.warn('[CivilRegistry] patientId is empty — skipping fetch');
            return;
        }

        console.debug('[CivilRegistry] Initiating fetch:', { patientId, program: PROGRAM_UID, orgUnitId });
        refetch({ patientId, orgUnitId });
    };

    return { mutate, isLoading, isError: !!fetchError };
};
