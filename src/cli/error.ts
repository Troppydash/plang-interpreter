import inout from "../inout";
import { colors } from "../inout/color";

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
    inout.print(`> devia ${args.join(' ')}`);

    // count offsets
    let offset = 8; // for '> devia '
    for (let i = 0; i < index; i++) {
        offset += args[i].length + 1;
    }

    inout.print(' '.repeat(offset) + colors.red('^'.repeat(args[index].length)));

    inout.print('');
    const exe = process.platform == "win32" ? "devia.exe" : "./devia";
    inout.print(`${colors.yellow('Tip')}: run '${exe} --help' to see the correct usages`);
    inout.print(`${colors.cyan('Reason')}: ${reason}`);
}
