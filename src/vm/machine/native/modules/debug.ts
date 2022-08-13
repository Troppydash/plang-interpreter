import {GenerateGuardedFunction} from "../helpers";
import {StackMachine} from "../../index";
import {PlConverter} from "../converter";
import {PlProgramToString} from "../../../emitter/printer";
import {IACTSync} from "../../../../problem/interactive";
import {IACTDebugger} from "../../../../problem/interactive/debugger";
import {isNode} from "../../../../inout";
import {NewPlStuff, PlStuff, PlStuffType, PlStuffTypeAny} from "../../stuff";
import PlToDebugString = PlConverter.PlToDebugString;

export const debug = {
    stack: GenerateGuardedFunction("stack", [], function (this: StackMachine) {
        return NewPlStuff(PlStuffType.List, [...this.stack]);
    }),
    closure: GenerateGuardedFunction("closure", [], function (this: StackMachine) {
        return NewPlStuff(PlStuffType.Dict, {...this.closureFrame.values});
    }),
    locals: GenerateGuardedFunction("locals", [], function (this: StackMachine) {
        return NewPlStuff(PlStuffType.Dict, {...this.stackFrame.values});
    }),
    globals: GenerateGuardedFunction("globals", [], function (this: StackMachine) {
        let out = {};
        let sf = this.stackFrame;
        do {
            const values = {};
            for (const [key, value] of Object.entries(sf.values)) {
                values[key] = value;
            }
            out = {...out, ...values};
        } while ((sf = sf.outer) != null);
        return NewPlStuff(PlStuffType.Dict, out);
    }),
    program: GenerateGuardedFunction("program", [], function (this: StackMachine) {
        return NewPlStuff(PlStuffType.List, PlProgramToString(this.program, false)
            .split('\n')
            .map(s => NewPlStuff(PlStuffType.Str, s)));
    }),
    pointer: GenerateGuardedFunction("pointer", [], function (this: StackMachine) {
        return NewPlStuff(PlStuffType.Num, this.pointer);
    }),
    format: GenerateGuardedFunction("format", [PlStuffTypeAny], function (item: PlStuff) {
        return NewPlStuff(PlStuffType.Str, PlToDebugString(item))
    })
};

if (isNode) {
    debug['debugger'] = GenerateGuardedFunction("debugger", [], function (this: StackMachine) {
        if (this.inout.options['mode'] == 'release' || this.inout.options["run"] == "repl")
            return null;
        IACTSync(IACTDebugger(this));
        throw "debugger";
    });
}
