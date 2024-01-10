import React from "react";
import {Button} from "@dhis2/ui";
import {Field, Form, Formik} from "formik";
import {useExternalData} from "./useExternalData";
import {SetFieldValueProps} from "../../Plugin.types";

type Props = {
    setFieldValue: (values: SetFieldValueProps) => void;
};

export const ExternalSourceForm = ({ setFieldValue }: Props) => {
    const { mutate, isLoading } = useExternalData({ setFieldValue });

    return (
        <>
            <h4>
                Search in civil registry
            </h4>

            <Formik
                initialValues={{
                    patientId: '',
                }}
                onSubmit={({ patientId }) => {
                    mutate({ patientId });
                }}
            >
                <Form
                    style={{
                        display: 'flex',
                        gap: '10px',
                    }}
                >
                    <Field
                        name={'patientId'}
                    />

                    {/*@ts-ignore*/}
                    <Button
                        primary
                        type={'submit'}
                        loading={isLoading}
                    >
                        Search
                    </Button>
                </Form>
            </Formik>
        </>
    )
}
