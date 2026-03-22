import { useState } from 'react';
import { useDataQuery, useDataEngine } from '@dhis2/app-runtime';
import { SetFieldValueProps } from '../../Plugin.types';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type CountResults = {
    males: number;
    females: number;
    age0_18: number;
    age19_35: number;
    age36_60: number;
    age60plus: number;
    total: number;
};

type Props = {
    setFieldValue?: (values: SetFieldValueProps) => void;
    orgUnitId?: string;
};

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

const PROGRAM_UID = 'YdLl8aLY91v'; // ADEY_Participants Tracking Tool
const YOUTH_STATUS_STAGE_UID = 'yvHS9FuVRvA'; // Youth_Status_Change stage
const ENTERPRISE_DE = 'TlsDM3P677Z'; // Enterprise Unique ID (data element in event)
const SEX_ATTR_UID = 'UuarYVu1ga2'; // Sex (TEI attribute)
const DOB_ATTR_UID = 'CoBkeZU3pGi'; // Date of Birth (TEI attribute)

// ─────────────────────────────────────────────────────────────────
// Step 1 query — fetch all Youth_Status_Change events
// No API-level filter (data elements can't be filtered via filter param).
// Client-side filtering is done in onComplete.
// ─────────────────────────────────────────────────────────────────

const EVENTS_QUERY = {
    events: {
        resource: 'tracker/events',
        params: () => ({
            program: PROGRAM_UID,
            programStage: YOUTH_STATUS_STAGE_UID,
            fields: 'trackedEntity,dataValues[dataElement,value]',
            ouMode: 'ALL',
            pageSize: 1000,
        }),
    },
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function ageKey(
    age: number
): keyof Pick<CountResults, 'age0_18' | 'age19_35' | 'age36_60' | 'age60plus'> {
    if (age <= 18) return 'age0_18';
    if (age <= 35) return 'age19_35';
    if (age <= 60) return 'age36_60';
    return 'age60plus';
}

function trySet(
    fn: ((v: SetFieldValueProps) => void) | undefined,
    fieldId: string,
    value: any
) {
    if (typeof fn === 'function') {
        console.debug(`[EnterpriseCount] setFieldValue({ fieldId: "${fieldId}", value: ${value} })`);
        fn({ fieldId, value });
    }
}

// ─────────────────────────────────────────────────────────────────
// Aggregation — called after all TEI attributes are loaded
// ─────────────────────────────────────────────────────────────────

function aggregateCounts(
    teis: any[],
    setFieldValue?: (v: SetFieldValueProps) => void
): CountResults {
    const counts: CountResults = {
        males: 0, females: 0,
        age0_18: 0, age19_35: 0, age36_60: 0, age60plus: 0,
        total: 0,
    };

    const today = new Date();

    teis.forEach((tei: any, idx: number) => {
        const attrs: Array<{ attribute: string; value: string }> = tei.attributes ?? [];

        const sex = attrs.find(a => a.attribute === SEX_ATTR_UID)?.value ?? '';
        const dob = attrs.find(a => a.attribute === DOB_ATTR_UID)?.value ?? '';
        const age = dob ? today.getFullYear() - new Date(dob).getFullYear() : null;

        console.debug(
            `[EnterpriseCount] TEI[${idx}] ${tei.trackedEntity ?? tei.uid} | sex="${sex}" | dob="${dob}" | age=${age ?? 'N/A'}`
        );

        if (sex === 'Male') counts.males += 1;
        else if (sex === 'Female') counts.females += 1;
        else console.warn(`[EnterpriseCount] TEI[${idx}] unrecognised sex: "${sex}"`);

        if (age !== null && !isNaN(age)) {
            counts[ageKey(age)] += 1;
        } else {
            console.warn(`[EnterpriseCount] TEI[${idx}] skipping age — DOB missing/invalid: "${dob}"`);
        }

        counts.total += 1;
    });

    console.log('[EnterpriseCount] ✅ Final counts:', counts);

    trySet(setFieldValue, 'male', counts.males);
    trySet(setFieldValue, 'female', counts.females);
    trySet(setFieldValue, 'age_0_18', counts.age0_18);
    trySet(setFieldValue, 'age_19_35', counts.age19_35);
    trySet(setFieldValue, 'age_36_60', counts.age36_60);
    trySet(setFieldValue, 'age_60_plus', counts.age60plus);

    return counts;
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export const useExternalData = ({ setFieldValue, orgUnitId: _orgUnitId }: Props) => {
    const engine = useDataEngine();

    const [counts, setCounts] = useState<CountResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    const [pendingEnterpriseId, setPendingEnterpriseId] = useState('');

    // ── Step 2: fetch each TEI individually (avoids semicolon-list URL issues) ──
    const fetchTeiAttributes = async (teiUids: string[]) => {
        console.log(`[EnterpriseCount] ▶ Step 2 — fetching ${teiUids.length} TEIs one by one`);

        const results = await Promise.all(
            teiUids.map(async (teiUid) => {
                try {
                    const result: any = await engine.query({
                        tei: {
                            resource: `tracker/trackedEntities/${teiUid}`,
                            params: {
                                fields: 'trackedEntity,attributes[attribute,value]',
                                ouMode: 'ALL',
                            },
                        },
                    });
                    console.debug(`[EnterpriseCount] Fetched TEI ${teiUid}:`, result?.tei?.attributes?.length, 'attributes');
                    return result?.tei ?? null;
                } catch (err) {
                    console.error(`[EnterpriseCount] ❌ Failed to fetch TEI ${teiUid}:`, err);
                    return null;
                }
            })
        );

        const validTeis = results.filter(Boolean);
        console.log(`[EnterpriseCount] ◀ Step 2 complete — ${validTeis.length}/${teiUids.length} TEIs loaded`);
        return validTeis;
    };

    // ── Step 1: fetch all events, filter client-side ──────────────
    const { refetch: fetchEvents } = useDataQuery(EVENTS_QUERY, {
        lazy: true,
        onComplete: async (data) => {
            try {
                const raw = data as any;
                const events: any[] = raw?.events?.instances ?? raw?.events?.events ?? [];
                console.log(`[EnterpriseCount] ◀ Step 1 — ${events.length} total events`);

                // ── Client-side filter by ENTERPRISE_DE TlsDM3P677Z ──
                const filteredEvents = events.filter((event: any) => {
                    const enterprise = event.dataValues?.find(
                        (dv: any) => dv.dataElement === ENTERPRISE_DE
                    );
                    return enterprise?.value?.toString().trim() === pendingEnterpriseId;
                });

                console.log(
                    `[EnterpriseCount] Matched ${filteredEvents.length} events for enterprise="${pendingEnterpriseId}"`
                );

                if (filteredEvents.length === 0) {
                    console.warn('[EnterpriseCount] ⚠ No participants found.');
                    setCounts({ males: 0, females: 0, age0_18: 0, age19_35: 0, age36_60: 0, age60plus: 0, total: 0 });
                    setIsLoading(false);
                    return;
                }

                // Deduplicate TEI UIDs
                const teiUids = Array.from(
                    new Set<string>(filteredEvents.map((ev: any) => ev.trackedEntity).filter(Boolean))
                );
                console.log(`[EnterpriseCount] Deduped to ${teiUids.length} unique TEIs`);

                // Step 2: individual per-TEI fetches
                const teis = await fetchTeiAttributes(teiUids);
                setCounts(aggregateCounts(teis, setFieldValue));
                setIsError(false);
            } catch (err) {
                console.error('[EnterpriseCount] ❌ Processing failed:', err);
                setIsError(true);
                setCounts(null);
            } finally {
                setIsLoading(false);
            }
        },
        onError: (err) => {
            console.error('[EnterpriseCount] ❌ Step 1 (events fetch) failed:', err);
            console.error('[EnterpriseCount] Detail:', JSON.stringify(err, null, 2));
            setCounts(null);
            setIsLoading(false);
            setIsError(true);
        },
    });

    // ── Public search function ────────────────────────────────────
    const search = ({ enterpriseIdValue }: { enterpriseIdValue: string }) => {
        if (!enterpriseIdValue.trim()) {
            console.warn('[EnterpriseCount] search() with empty value — skipping');
            return;
        }
        console.log(
            `[EnterpriseCount] ▶ Search | enterprise="${enterpriseIdValue}" | program=${PROGRAM_UID} | stage=${YOUTH_STATUS_STAGE_UID} | DE=${ENTERPRISE_DE}`
        );
        setPendingEnterpriseId(enterpriseIdValue.trim());
        setCounts(null);
        setIsError(false);
        setIsLoading(true);
        fetchEvents({});
    };

    return { search, counts, isLoading, isError };
};
