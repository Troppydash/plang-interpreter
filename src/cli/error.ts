import {Inout} from "../inout";
import { colors } from "../inout/color";
import {PNAME} from "./constants";

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
    const {index, reason} = error;

    Inout().print(colors.red(`CLI Problems:`));
    Inout().print(`> ${PNAME} ${args.join(' ')}`);

    // count offsets
    let offset = PNAME.length + 3; // for '> devia '
    for (let i = 0; i < index; i++) {
        offset += args[i].length + 1;
    }

    Inout().print(' '.repeat(offset) + colors.red('^'.repeat(args[index].length) + " here"));

    Inout().print('');
    Inout().print(`${colors.yellow('Tip')}: run '${PNAME} --help' to see the correct usages`);
    Inout().print(`${colors.cyan('Reason')}: ${reason}`);
}
