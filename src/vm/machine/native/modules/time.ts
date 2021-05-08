import { GenerateJsGuardedFunction } from "../helpers";

export const time = {
    time: {
        now: GenerateJsGuardedFunction("now", [], () => {
            return (new Date()).getTime();
        }),
        measure: GenerateJsGuardedFunction("measure", ["function"], (closure) => {
            const start = (new Date()).getTime();
            closure();
            return (new Date()).getTime() - start;
        }),
        benchmark: GenerateJsGuardedFunction("benchmark", ["number", "function"], (amount, closure) => {
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
