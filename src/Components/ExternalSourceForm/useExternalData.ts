import { useState } from 'react';
import { useDataQuery, useDataEngine } from '@dhis2/app-runtime';
import { SetFieldValueProps } from '../../Plugin.types';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type CountResults = {
    males: number;
    females: number;
    ageYouth: number;    // age 15–35
    ageNonYouth: number; // age > 35
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
const YOUTH_STATUS_STAGE_UID = 'yvHS9FuVRvA'; // Y
// outh_Status_Change stage
const ENTERPRISE_DE = 'TlsDM3P677Z'; // Enterprise Unique ID (data element in event)
const SEX_ATTR_UID = 'UuarYVu1ga2'; // Sex (TEI attribute)
const DOB_ATTR_UID = 'CoBkeZU3pGi'; // Date of Birth (TEI attribute)



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

/** Calculate age in whole years from an ISO-8601 DOB string. Returns null if invalid. */
function calculateAge(dob: string): number | null {
    if (!dob?.trim()) return null;
    const birth = new Date(dob.trim());
    if (isNaN(birth.getTime())) {
        console.warn(`[EnterpriseCount] ⚠ Unparseable DOB: "${dob}"`);
        return null;
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age;
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


function aggregateCounts(
    teis: any[],
    setFieldValue?: (v: SetFieldValueProps) => void
): CountResults {
    const counts: CountResults = {
        males: 0, females: 0,
        ageYouth: 0, ageNonYouth: 0,
        total: 0,
    };

    teis.forEach((tei: any, idx: number) => {
        const attrs: Array<{ attribute: string; value: string }> = tei.attributes ?? [];

        const sex = attrs.find(a => a.attribute === SEX_ATTR_UID)?.value ?? '';
        const dob = attrs.find(a => a.attribute === DOB_ATTR_UID)?.value ?? '';
        const age = calculateAge(dob);

        console.debug(
            `[EnterpriseCount] TEI[${idx}] ${tei.trackedEntity ?? tei.uid} | sex="${sex}" | dob="${dob}" | age=${age ?? 'N/A'}`
        );

        if (sex === 'Male') counts.males += 1;
        else if (sex === 'Female') counts.females += 1;
        else console.warn(`[EnterpriseCount] TEI[${idx}] unrecognised sex: "${sex}"`);

        if (age !== null) {
            if (age >= 15 && age <= 35) counts.ageYouth += 1;
            else if (age > 35) counts.ageNonYouth += 1;
            // ages < 15 are not counted in either group
        } else {
            console.warn(`[EnterpriseCount] TEI[${idx}] skipping age — DOB missing/invalid: "${dob}"`);
        }

        counts.total += 1;
    });

    console.log('[EnterpriseCount] ✅ Final counts:', counts);

    trySet(setFieldValue, 'male', counts.males);
    trySet(setFieldValue, 'female', counts.females);
    trySet(setFieldValue, 'age_youth', counts.ageYouth);
    trySet(setFieldValue, 'age_nonYouth', counts.ageNonYouth);

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
                    setCounts({ males: 0, females: 0, ageYouth: 0, ageNonYouth: 0, total: 0 });
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
