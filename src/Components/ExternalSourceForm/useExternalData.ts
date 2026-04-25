import { useState, useRef } from 'react';
import { useDataQuery, useDataEngine } from '@dhis2/app-runtime';
import { SetFieldValueProps } from '../../Plugin.types';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type CountResults = {
    totalgroupmembers: number;
    femaleyouth:       number;
    maleyouth:         number;
    idp:               number;
    idpfemale:         number;
    idpmale:           number;
    pwd:               number;
    pwdfemale:         number;
    pwdmale:           number;
    refugee:           number;
    returnee:          number;
};

export type ErrorType = 'notFoundError' | 'fetchError' | null;

type Props = {
    setFieldValue?: (values: SetFieldValueProps) => void;
    orgUnitId?: string;
};

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

const PROGRAM_UID            = 'YdLl8aLY91v';
const YOUTH_STATUS_STAGE_UID = 'yvHS9FuVRvA';
const ENTERPRISE_DE          = 'TlsDM3P677Z';

const SEX_ATTR_UID      = 'UuarYVu1ga2';
const DOB_ATTR_UID      = 'CoBkeZU3pGi';
const IDP_ATTR_UID      = 'NZ5I8At04Qv';
const PWD_ATTR_UID      = 'xOJ8s05UAXV';
const REFUGEE_ATTR_UID  = 'GZOhLCUakHR';
const RETURNEE_ATTR_UID = 'LVPx2XDOwrK';

const FIELD_MAP: Record<keyof CountResults, string> = {
    totalgroupmembers: 'totalgroupmembers',
    femaleyouth:       'femaleyouth',
    maleyouth:         'maleyouth',
    idp:               'idp',
    idpfemale:         'idpfemale',
    idpmale:           'idpmale',
    pwd:               'pwd',
    pwdfemale:         'pwdfemale',
    pwdmale:           'pwdmale',
    refugee:           'refugee',
    returnee:          'returnee',
};

// ─────────────────────────────────────────────────────────────────
// Events query
// ─────────────────────────────────────────────────────────────────

const EVENTS_QUERY = {
    events: {
        resource: 'tracker/events',
        params: () => ({
            program:      PROGRAM_UID,
            programStage: YOUTH_STATUS_STAGE_UID,
            fields:       'trackedEntity,dataValues[dataElement,value]',
            ouMode:       'ALL',
            pageSize:     2000,
        }),
    },
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function calculateAge(dob: string): number | null {
    if (!dob?.trim()) return null;
    const birth = new Date(dob.trim());
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age;
}

function isYes(value: string): boolean {
    return ['true', 'yes', '1'].includes((value ?? '').trim().toLowerCase());
}

function getAttr(attrs: Array<{ attribute: string; value: string }>, uid: string): string {
    return attrs.find(a => a.attribute === uid)?.value ?? '';
}

function trySet(fn: ((v: SetFieldValueProps) => void) | undefined, fieldId: string, value: number) {
    if (typeof fn === 'function') fn({ fieldId, value: String(value) });
}

function calculateCounts(
    teis: any[],
    setFieldValue?: (v: SetFieldValueProps) => void
): CountResults {
    const c: CountResults = {
        totalgroupmembers: 0, femaleyouth: 0, maleyouth: 0,
        idp: 0, idpfemale: 0, idpmale: 0,
        pwd: 0, pwdfemale: 0, pwdmale: 0,
        refugee: 0, returnee: 0,
    };

    for (const tei of teis) {
        const attrs    = tei.attributes ?? [];
        const sex      = getAttr(attrs, SEX_ATTR_UID);
        const age      = calculateAge(getAttr(attrs, DOB_ATTR_UID));
        const isYouth  = age !== null && age >= 15 && age <= 35;
        const isFemale = sex === 'Female';
        const isMale   = sex === 'Male';
        const idp      = isYes(getAttr(attrs, IDP_ATTR_UID));
        const pwd      = isYes(getAttr(attrs, PWD_ATTR_UID));
        const refugee  = isYes(getAttr(attrs, REFUGEE_ATTR_UID));
        const returnee = isYes(getAttr(attrs, RETURNEE_ATTR_UID));

        console.log(
            `[EnterpriseCount] TEI ${tei.trackedEntity} | sex="${sex}" | age=${age ?? 'N/A'} | youth=${isYouth} | IDP=${idp} | PWD=${pwd} | refugee=${refugee} | returnee=${returnee}`
        );

        // Skip non-youth entirely
        if (!isYouth) continue;

        c.totalgroupmembers += 1;
        if (isFemale) c.femaleyouth += 1;
        if (isMale)   c.maleyouth   += 1;

        if (idp) { c.idp += 1; if (isFemale) c.idpfemale += 1; if (isMale) c.idpmale += 1; }
        if (pwd) { c.pwd += 1; if (isFemale) c.pwdfemale += 1; if (isMale) c.pwdmale += 1; }
        if (refugee)  c.refugee  += 1;
        if (returnee) c.returnee += 1;
    }

    console.log('[EnterpriseCount] ✅ Final counts:', c);
    (Object.keys(c) as Array<keyof CountResults>).forEach(k => trySet(setFieldValue, FIELD_MAP[k], c[k]));
    return c;
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useExternalData({ setFieldValue, orgUnitId: _orgUnitId }: Props) {
    const engine = useDataEngine();

    const [counts,    setCounts]    = useState<CountResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error,     setError]     = useState<ErrorType>(null);

    // ── Use a ref so onComplete always reads the current enterprise ID
    //    without being affected by React's state batching / stale closures ──
    const enterpriseIdRef = useRef<string>('');

    // ── Step 2: fetch individual TEI profiles ─────────────────────
    async function fetchTeis(teiUids: string[]): Promise<any[]> {
        console.log(`[EnterpriseCount] ▶ Step 2 — fetching ${teiUids.length} TEIs`);
        const results = await Promise.all(
            teiUids.map(async (uid) => {
                try {
                    const res: any = await engine.query({
                        tei: {
                            resource: `tracker/trackedEntities/${uid}`,
                            params: { fields: 'trackedEntity,attributes[attribute,value]', ouMode: 'ALL' },
                        },
                    });
                    return res?.tei ?? null;
                } catch (e) {
                    console.error(`[EnterpriseCount] ❌ Failed TEI ${uid}:`, e);
                    return null;
                }
            })
        );
        const valid = results.filter(Boolean);
        console.log(`[EnterpriseCount] ◀ Step 2 complete — ${valid.length}/${teiUids.length} loaded`);
        return valid;
    }

    // ── Step 1: fetch events, filter by enterprise ID from ref ────
    const { refetch: fetchEvents } = useDataQuery(EVENTS_QUERY, {
        lazy: true,

        onComplete: async (data: any) => {
            try {
                const events: any[] = data?.events?.instances ?? data?.events?.events ?? [];
                const currentId = enterpriseIdRef.current;

                console.log(`[EnterpriseCount] ◀ Step 1 — ${events.length} events | filtering for "${currentId}"`);

                const matched = events.filter((ev: any) => {
                    const dv = ev.dataValues?.find((d: any) => d.dataElement === ENTERPRISE_DE);
                    return dv?.value?.toString().trim() === currentId;
                });

                console.log(`[EnterpriseCount] ${matched.length} events matched`);

                if (matched.length === 0) {
                    setCounts(null);
                    setError('notFoundError');
                    setIsLoading(false);
                    return;
                }

                const teiUids = Array.from(
                    new Set<string>(matched.map((ev: any) => ev.trackedEntity).filter(Boolean))
                );
                console.log(`[EnterpriseCount] ${teiUids.length} unique TEIs`);

                const teis = await fetchTeis(teiUids);
                setCounts(calculateCounts(teis, setFieldValue));
                setError(null);
            } catch (e) {
                console.error('[EnterpriseCount] ❌ Processing error:', e);
                setError('fetchError');
                setCounts(null);
            } finally {
                setIsLoading(false);
            }
        },

        onError: (e: any) => {
            console.error('[EnterpriseCount] ❌ Events fetch failed:', e);
            setCounts(null);
            setError('fetchError');
            setIsLoading(false);
        },
    });

    // ── Public search ─────────────────────────────────────────────
    function search({ enterpriseIdValue }: { enterpriseIdValue: string }) {
        const id = enterpriseIdValue.trim();
        if (!id) return;

        console.log(`[EnterpriseCount] ▶ Search — enterprise="${id}"`);

        // Write to ref BEFORE fetchEvents so onComplete sees the current value
        enterpriseIdRef.current = id;

        setCounts(null);
        setError(null);
        setIsLoading(true);
        fetchEvents({});
    }

    return { search, counts, isLoading, error };
}