import inout from "../inout";

export interface CliError {
    index: number;
    reason: string;
}

export function NewCliError(index: number, reason: string) {
    return {
        index,
        reason
    };
}


export function LogCliError(args: string[], error: CliError) {
    inout.print(error.reason);
}
