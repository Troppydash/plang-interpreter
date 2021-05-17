import { CliError, NewCliError } from "./error";
import { CLI_FLAGS, MatchFlag, MatchPrefix } from "./options";

type CliRaw = string;
type CliFlag = typeof CLI_FLAGS[number];
type CliOption = {
    key: string;
    value: string;
}

export class CliArguments {
    readonly raw: CliRaw[];
    readonly flags: CliFlag[];
    readonly options: CliOption[];

    readonly error: CliError | null;

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

    getArgSize(): number {
        return this.raw.length;
    }

    getArgFirst(): CliRaw {
        return this.raw[0];
    }

    getArgRest(): CliRaw[] {
        return this.raw.slice(1);
    }

    /**
     * Takes process.args as parameter, return a structure containing flags, options, and raw values
     * @param args List of string arguments
     * @return A CliArgument structure
     */
    static Parse(args: string[]): CliArguments {
        /**
         *  How it would parse
         *  It will parse for flags until one fail to match
         *  Then all raw
         */

        let parsingRaw = false;
        const raw = [], flags = [], options = [];

        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            if (parsingRaw) {
                raw.push(arg);
                continue;
            }

            if (!arg.startsWith("--")) {
                raw.push(arg);
                parsingRaw = true;
                continue;
            }

            const flag = MatchPrefix(arg.substring(2));
            if (flag == null) {
                raw.push(arg);
                parsingRaw = true;
                continue;
            }

            const index = flag.indexOf("=");
            if (index == -1 ) {
                if (MatchFlag(flag)) {
                    flags.push(flag);
                } else {
                    return new CliArguments(NewCliError(i, `there is no flag called '${arg}'`));
                }
            } else {
                const key = arg.substring(0, index);
                const value = arg.substring(index);
                options.push({
                    key, value
                });
            }
        }

        return new CliArguments(null, raw, flags, options);
    }
}


// TODO: Put all options in this module

