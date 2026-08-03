import './tailwind.css';
import './index.css';
import React from "react";
import { Button } from "@dhis2/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IDataEntryPluginProps } from "./Plugin.types";
import { ExternalSourceForm } from "./Components/ExternalSourceForm";

const queryClient = new QueryClient();

const PluginInner = (propsFromParent: IDataEntryPluginProps) => {
    const {
        fieldsMetadata,
        setFieldValue,
        orgUnitId,
    } = propsFromParent;

    return (
        <QueryClientProvider client={queryClient}>
            <div className={'bg-white w-full flex'}>
                <div className={'w-full'}>
                    {/* The toggle button and PluginDetails are now removed */}
                    <ExternalSourceForm
                        setFieldValue={setFieldValue}
                        orgUnitId={orgUnitId}
                        fieldsMetadata={fieldsMetadata}
                    />
                </div>
            </div>
        </QueryClientProvider>
    )
}

export default PluginInner;
