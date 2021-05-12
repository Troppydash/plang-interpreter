import {ScrambleFunction} from "../scrambler";
import {PlActions, PlConverter} from "./converter";
import {NewPlStuff, PlStuff, PlStuffNull, PlStuffType} from "../stuff";
import {AssertTypeof, GenerateGuardedFunction, GenerateJsGuardedFunction} from "./helpers";
import {StackMachine} from "../index"; // Hopefully this doesn't cause a circular dependency problem
import {MakeNoTypeFunctionMessage} from "./messeger";
import PlToString = PlActions.PlToString;

export const jsSpecial = {
    "range": function (start, end, step) {
        if (start != undefined)
            AssertTypeof("range", start, "number", 1);
        if (end != undefined)
            AssertTypeof("range", end, "number", 2);
        if (step != undefined)
            AssertTypeof("range", step, "number", 3);

        if (arguments.length > 3) {
            throw new Error("'range' can only take a maximum of three arguments - start, end, step");
        }

        if (arguments.length == 2) {
            step = 1;
        }

        if (arguments.length == 1) {
            end = start;
            start = step = 1;
        }

        let current = start;
        return {
            iter: () => {
                return {
                    next: () => {
                        if (current > end) {
                            return [[null, null], false];
                        }
                        const out = [[current, current], true];
                        current += step;
                        return out;
                    }
                }
            }
        }
    },

    "try": GenerateJsGuardedFunction("try", ["function", "function"], function (this: StackMachine, attempt, error) {
        const saved = this.saveState();
        try {
            return attempt();
        } catch (e) {
            this.restoreState(saved);
            return error(this.problems.pop());
        }
    }),
};

export const special = {
    "eval": GenerateGuardedFunction("eval", ["*"], function (this: StackMachine, target: PlStuff) {
        let iter = null; // TODO: maybe make all iterator based
        if (target.type == PlStuffType.Dict
            && "iter" in target.value
            && (target.value.iter.type == PlStuffType.Func
                || target.value.iter.type == PlStuffType.NFunc)) {
            iter = target.value.iter;
        } else {
            iter = this.findFunction("iter", target);
        }
        if (iter == null) {
            throw new Error(MakeNoTypeFunctionMessage("eval", "iter", target));
        }

        // trust that the iterator is correct
        let iterator = this.runFunction(iter, target);
        const next = iterator.value.next;

        let out = [];
        let result;
        while ((result = this.runFunction(next)).value[1].value == true) {
            out.push(result.value[0].value[0]);
        }

        return NewPlStuff(PlStuffType.List, out);
    }),
    [ScrambleFunction("say")]: function (this: StackMachine, ...message: any) {
        if (message.length == 0) {
            this.inout.print('\n');
        } else {
            this.inout.print(message.map(m => PlActions.PlToString(m)).join(' '));
        }
        return PlStuffNull;
    },
    [ScrambleFunction("ask")]: function (this: StackMachine, ...message: any) {
        const str = this.inout.input(message.map(m => PlActions.PlToString(m)).join('\n'));
        if (str == null) {
            return PlStuffNull;
        }
        return NewPlStuff(PlStuffType.Str, str);
    },
    [ScrambleFunction("javascript")]: GenerateGuardedFunction("javascript", [PlStuffType.Str], function (this: StackMachine, code: PlStuff) {
        const _import = (function (key) {
            const value = this.findValue(key);
            if (value == null) {
                return null;
            }
            return PlConverter.PlToJs(this.findValue(key), this.runFunction.bind(this));
        }).bind(this);
        const _export = (function (key, value) {
            this.createValue(key, PlConverter.JsToPl(value, this.runFunction.bind(this)));
            return null;
        }).bind(this);

        try {
            this.inout.execute(code.value, {
                pl: {
                    import: _import,
                    export: _export
                }
            })
        } catch (e) {
            if (e == null) {
                throw null;
            }
            throw new Error(`[Javascript ${e.name}] ${e.message}`);
        }
    }),
    [ScrambleFunction("panic")]: (...message: PlStuff[]) => {
        throw new Error(message.map(m => PlToString(m)).join(' '));
    },
}
