import React, { useState } from "react";
import i18n from '@dhis2/d2-i18n';
import { Button, Input } from "@dhis2/ui";
import { useExternalData } from "./useExternalData";
import { SetFieldValueProps } from "../../Plugin.types";

type Props = {
    setFieldValue: (values: SetFieldValueProps) => void;
};

export const ExternalSourceForm = ({ setFieldValue }: Props) => {
    const { mutate, isLoading } = useExternalData({ setFieldValue });
    const [patientId, setPatientId] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!patientId.trim()) {
            setError(i18n.t('Patient ID is required'));
            return;
        }

        setError('');
        mutate({ patientId });
    };

    return (
        <>
            <form
                className={'fieldContainer'}
                onSubmit={handleSubmit}
            >
                <div className={'labelContainer'}>
                    <label
                        htmlFor={'patientId'}
                        className={'label'}
                    >
                        {i18n.t('Patient ID')}
                    </label>
                </div>

                <div className={'inputContainer'}>
                    <Input
                        placeholder={i18n.t('Enter patient ID')}
                        className={'input'}
                        value={patientId}
                        onChange={({ value }: { value: string }) => {
                            setPatientId(value);
                            if (error) {
                                setError('');
                            }
                        }}
                    />

                    <Button
                        primary
                        type={'submit'}
                        loading={isLoading}
                    >
                        {i18n.t('Search')}
                    </Button>
                </div>

                {error && (
                    <div className={'errorMessage'}>
                        {error}
                    </div>
                )}
            </form>
        </>
    )
}
