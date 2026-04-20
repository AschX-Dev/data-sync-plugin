import React from "react";
import { IDataEntryPluginProps } from "../../Plugin.types";
import { ExternalSourceForm } from "../ExternalSourceForm";

export const PluginDetails = ({
    fieldsMetadata,
    setFieldValue,
    orgUnitId,
}: IDataEntryPluginProps) => (
    <div className="p-4 w-full flex justify-center">
        <div className="w-full max-w-[600px]">
            <ExternalSourceForm 
                fieldsMetadata={fieldsMetadata}
                setFieldValue={setFieldValue}
                orgUnitId={orgUnitId}
            />
        </div>
    </div>
);
