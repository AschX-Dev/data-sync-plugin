import React, { useState } from 'react';
import i18n from '@dhis2/d2-i18n';
import { Button, Input, CircularLoader, NoticeBox } from '@dhis2/ui';
import { useExternalData } from './useExternalData';
import { SetFieldValueProps } from '../../Plugin.types';

type Props = {
    setFieldValue: (values: SetFieldValueProps) => void;
    orgUnitId?: string;
    fieldsMetadata?: Record<string, any>;
};

// ── Count tile ────────────────────────────────────────────────────
const CountTile = ({ label, value }: { label: string; value: number }) => (
    <div style={styles.tile}>
        <span style={styles.tileValue}>{value}</span>
        <span style={styles.tileLabel}>{label}</span>
    </div>
);

// ── Section heading ───────────────────────────────────────────────
const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <div style={styles.sectionLabel}>{children}</div>
);

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export const ExternalSourceForm = ({ setFieldValue, orgUnitId }: Props) => {
    const { search, counts, isLoading, isError } = useExternalData({
        setFieldValue,
        orgUnitId,
    });

    const [enterpriseId, setEnterpriseId] = useState('');
    const [validationError, setValidationError] = useState('');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!enterpriseId.trim()) {
            setValidationError(i18n.t('Enterprise Unique ID is required'));
            console.warn('[EnterpriseCount] Submitted with empty enterprise ID');
            return;
        }
        setValidationError('');
        console.log(`[EnterpriseCount] Submitted — enterpriseId="${enterpriseId.trim()}"`);
        search({ enterpriseIdValue: enterpriseId.trim() });
    };

    const hasResults = counts !== null;
    const noRecords = hasResults && counts.total === 0;

    const loadingText = i18n.t('Searching participants…');

    return (
        <div style={styles.wrapper}>

            {/* ── Search form ── */}
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.inputRow}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            {i18n.t('Enterprise Unique ID')}
                        </label>
                        <Input
                            name="enterpriseId"
                            placeholder={i18n.t('Enter enterprise unique ID')}
                            value={enterpriseId}
                            onChange={({ value }: { value: string }) => {
                                setEnterpriseId(value);
                                if (validationError) setValidationError('');
                            }}
                            disabled={isLoading}
                        />
                        {validationError && (
                            <span style={styles.validationError}>{validationError}</span>
                        )}
                    </div>

                    <div style={styles.buttonWrapper}>
                        <Button primary type="submit" loading={isLoading} disabled={isLoading}>
                            {isLoading ? i18n.t('Searching…') : i18n.t('Search')}
                        </Button>
                    </div>
                </div>
            </form>

            {/* ── Loading ── */}
            {isLoading && (
                <div style={styles.centered}>
                    <CircularLoader small />
                    <span style={styles.loadingText}>{loadingText}</span>
                </div>
            )}

            {/* ── Error ── */}
            {isError && !isLoading && (
                <NoticeBox error title={i18n.t('Query failed')}>
                    {i18n.t(
                        'Could not fetch participant data. Check the browser console for details. ' +
                        'Make sure the YOUTH_STATUS_STAGE_UID and ENTERPRISE_DE_UID constants are filled in.'
                    )}
                </NoticeBox>
            )}

            {/* ── No results ── */}
            {noRecords && !isLoading && (
                <NoticeBox warning title={i18n.t('No participants found')}>
                    {i18n.t(
                        'No participants were found for enterprise ID "{{id}}" in the Youth_Status_Change events.',
                        { id: enterpriseId }
                    )}
                </NoticeBox>
            )}

            {/* ── Results card ── */}
            {hasResults && !noRecords && !isLoading && (
                <div style={styles.resultsCard}>

                    {/* Header */}
                    <div style={styles.cardHeader}>
                        <span style={styles.cardTitle}>{i18n.t('Participant Summary')}</span>
                        <span style={styles.totalBadge}>
                            {i18n.t('Total: {{n}}', { n: counts!.total })}
                        </span>
                    </div>

                    {/* Gender */}
                    <SectionHeading>{i18n.t('By Sex')}</SectionHeading>
                    <div style={styles.tileRow}>
                        <CountTile label={i18n.t('Male')} value={counts!.males} />
                        <CountTile label={i18n.t('Female')} value={counts!.females} />
                    </div>

                    {/* Age groups */}
                    <SectionHeading>{i18n.t('By Age Group')}</SectionHeading>
                    <div style={styles.tileRow}>
                        <CountTile label={i18n.t('0 – 18')} value={counts!.age0_18} />
                        <CountTile label={i18n.t('19 – 35')} value={counts!.age19_35} />
                        <CountTile label={i18n.t('36 – 60')} value={counts!.age36_60} />
                        <CountTile label={i18n.t('60+')} value={counts!.age60plus} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    form: { width: '100%' },
    inputRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '12px',
        flexWrap: 'wrap',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
        minWidth: '220px',
    },
    label: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#212934',
    },
    validationError: {
        fontSize: '12px',
        color: '#d32f2f',
        marginTop: '2px',
    },
    buttonWrapper: { flexShrink: 0, paddingBottom: '2px' },
    centered: { display: 'flex', alignItems: 'center', gap: '8px' },
    loadingText: { fontSize: '13px', color: '#555' },

    // Results card
    resultsCard: {
        background: '#f9fafb',
        border: '1px solid #d5dde5',
        borderRadius: '6px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    cardTitle: {
        fontSize: '14px',
        fontWeight: 700,
        color: '#212934',
    },
    totalBadge: {
        fontSize: '12px',
        fontWeight: 500,
        color: '#fff',
        background: '#2c6fad',
        borderRadius: '12px',
        padding: '2px 10px',
    },
    sectionLabel: {
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        color: '#6c7882',
        marginTop: '4px',
    },
    tileRow: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '10px',
    },
    tile: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        border: '1px solid #d5dde5',
        borderRadius: '6px',
        padding: '12px 20px',
        minWidth: '90px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    },
    tileValue: {
        fontSize: '26px',
        fontWeight: 700,
        color: '#212934',
        lineHeight: 1,
    },
    tileLabel: {
        fontSize: '12px',
        color: '#6c7882',
        marginTop: '4px',
        textAlign: 'center' as const,
    },
};
