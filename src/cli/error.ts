import inout from "../inout";
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

    inout.print(colors.red(`CLI Problems:`));
    inout.print(`> ${PNAME} ${args.join(' ')}`);

    // count offsets
    let offset = PNAME.length + 3; // for '> devia '
    for (let i = 0; i < index; i++) {
        offset += args[i].length + 1;
    }

    inout.print(' '.repeat(offset) + colors.red('^'.repeat(args[index].length) + " here"));

    inout.print('');
    inout.print(`${colors.yellow('Tip')}: run '${PNAME} --help' to see the correct usages`);
    inout.print(`${colors.cyan('Reason')}: ${reason}`);
}
