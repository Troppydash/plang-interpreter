import { NewEmptyFileInfo, PlFileInfo } from "../compiler/lexing/info";

export interface PlTraceFrame {
    name: string;
    info: PlFileInfo | null;
}

export function NewPlTraceFrame( name: string, info: PlFileInfo | null = null ): PlTraceFrame {
    return {
        name,
        info
    };
}

export type PlTrace = PlTraceFrame[];
