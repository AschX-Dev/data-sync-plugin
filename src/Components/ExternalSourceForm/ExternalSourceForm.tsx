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

export function ExternalSourceForm({ setFieldValue, orgUnitId }: Props) {
    const { search, counts, isLoading, error } = useExternalData({
        setFieldValue,
        orgUnitId,
    });

    const [enterpriseId,    setEnterpriseId]    = useState('');
    const [validationError, setValidationError] = useState('');

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!enterpriseId.trim()) {
            setValidationError(i18n.t('Enterprise Unique ID is required'));
            return;
        }
        setValidationError('');
        search({ enterpriseIdValue: enterpriseId.trim() });
    }

    return (
        <div style={styles.wrapper}>

            {/* ── Search form ── */}
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.inputRow}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            {i18n.t('Enterprise ID')}
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
                    <span style={styles.loadingText}>{i18n.t('Counting participants…')}</span>
                </div>
            )}

            {/* ── Fetch error ── */}
            {error === 'fetchError' && !isLoading && (
                <NoticeBox error title={i18n.t('Query failed')}>
                    {i18n.t('Could not fetch participant data. Check the browser console for details.')}
                </NoticeBox>
            )}

            {/* ── Not found ── */}
            {error === 'notFoundError' && !isLoading && (
                <NoticeBox warning title={i18n.t('No participants found')}>
                    {i18n.t(
                        'No participants were found linked to enterprise ID "{{id}}".',
                        { id: enterpriseId }
                    )}
                </NoticeBox>
            )}

            {/* ── Success ── */}
            {counts !== null && !isLoading && error === null && (
                <NoticeBox title={i18n.t('Fields updated')}>
                    {i18n.t(
                        '{{n}} youth participant(s) found for enterprise "{{id}}" — fields have been autofilled.',
                        { n: counts.totalgroupmembers, id: enterpriseId }
                    )}
                </NoticeBox>
            )}

        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '600px',
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
        minWidth: '200px',
    },
    label: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#212934',
    },
    validationError: {
        fontSize: '12px',
        color: '#d32f2f',
        marginTop: '2px',
    },
    buttonWrapper: { flexShrink: 0, paddingBottom: '2px' },
    centered:    { display: 'flex', alignItems: 'center', gap: '8px' },
    loadingText: { fontSize: '13px', color: '#555' },
};