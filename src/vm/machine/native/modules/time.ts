import {GenerateGuardedFunction} from "../helpers";
import {PlStuffType} from "../../stuff";

export const time = {
    time: {
        now: GenerateGuardedFunction("now", [], () => {
            return (new Date()).getTime();
        }),
        measure: GenerateGuardedFunction("measure", [PlStuffType.Func], (closure) => {
            const start = (new Date()).getTime();
            closure();
            return (new Date()).getTime() - start;
        }),
        benchmark: GenerateGuardedFunction("benchmark", [PlStuffType.Num, PlStuffType.Func], (amount, closure) => {
            const trial = [];
            for (let i = 0; i < amount; i++) {
                const start = (new Date()).getTime();
                closure();
                trial.push((new Date()).getTime() - start);
            }
            return trial;
        })
    }
};
