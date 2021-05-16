import { CliError, NewCliError } from "./error";

type CliRaw = string;

// run: what mode to run
// op: options
const FLAGS = ["run-demo", "run-repl", "run-parser", "run-emitter"] as const;
type CliFlag = typeof FLAGS[number];


type CliOption = {
    key: string;
    value: string;
}

export class CliArguments {
    raw: CliRaw[];
    flags: CliFlag[];
    options: CliOption[];

    error: CliError | null;

    constructor(error: CliError | null, raw: CliRaw[] = [], flags: CliFlag[] = [], options: CliOption[] = []) {
        this.raw = raw;
        this.flags = flags;
        this.options = options;
        this.error = error;
    }


    is(flag: CliFlag) {
        return this.flags.includes(flag);
    }

    getError(): CliError | null {
        return this.error;
    }

    /**
     * Takes process.args as parameter, return a structure containing flags, options, and raw values
     * @param args List of string arguments
     * @return A CliArgument structure
     */
    static Parse(args: string[]): CliArguments {
        const raw = [], flags = [], options = [];

        for (let i = 2; i < args.length; i++) {
            let arg = args[i];
            if (arg.startsWith("--")) {
                arg = arg.substring(2);
                const eq = arg.indexOf("=");
                if (eq == -1) {
                    // no =, flag it is
                    if (FLAGS.includes(arg as any)) {
                        flags.push(arg);
                        continue;
                    }
                    return new CliArguments(NewCliError(i, `flag '${arg}' is not a valid flag`));
                }

                // parse option
                const key = arg.substring(0, eq);
                const value = arg.substring(eq);
                options.push({
                    key, value
                });
            } else {
                // parse raw
                raw.push(arg);
            }
        }

        return new CliArguments(null, raw, flags, options);
    }
}


// TODO: Put all options in this module

