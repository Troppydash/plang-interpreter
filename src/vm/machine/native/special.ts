import {PlActions, PlConverter} from "./converter";
import {NewPlStuff, PlStuff, PlStuffNull, PlStuffType} from "../stuff";
import {AssertTypeof, GenerateGuardedFunction, GenerateJsGuardedFunction} from "./helpers";
import {StackMachine} from "../index"; // Hopefully this doesn't cause a circular dependency problem
import {MakeNoTypeFunctionMessage} from "./messeger";
import PlToString = PlConverter.PlToString;
import inout, {isNode} from "../../../inout";

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

        let forward = true;
        if (step < 0) {
            forward = false;
        }

        let current = start;
        return {
            iter: () => {
                return {
                    next: () => {
                        if (forward ? current > end : current < end) {
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
        let iterator = this.runFunction(iter, [target]);
        const next = iterator.value.next;

        let out = [];
        let result;
        while ((result = this.runFunction(next, [])).value[1].value == true) {
            out.push(result.value[0].value[0]);
        }

        return NewPlStuff(PlStuffType.List, out);
    }),
    "ask": function (this: StackMachine, ...message: any) {
        const str = this.inout.input(message.map(m => PlToString(m, this)).join('\n'));
        if (str == null) {
            return PlStuffNull;
        }
        return NewPlStuff(PlStuffType.Str, str);
    },
    "javascript": GenerateGuardedFunction("javascript", [PlStuffType.Str], function (this: StackMachine, code: PlStuff) {
        const _import = (function (key) {
            const value = this.findValue(key);
            if (value == null) {
                return null;
            }
            return PlConverter.PlToJs(value, this);
        }).bind(this);
        const _export = (function (key, value) {
            this.createValue(key, PlConverter.JsToPl(value, this));
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
    "panic": function (...message: PlStuff[]) {
        throw new Error(message.map(m => PlToString(m, this)).join(' '));
    },
    "locals": GenerateGuardedFunction("locals", [], function (this: StackMachine) {
        const obj = this.stackFrame.values;
        return NewPlStuff(PlStuffType.Dict, obj);
    }),
    "say": function (this: StackMachine, ...message: PlStuff[]) {
        if (message.length == 0) {
            this.inout.print('\n');
        } else {
            const combined = message.map(mess => PlToString(mess, this)).join(' ');
            this.inout.print(combined);
        }
        return PlStuffNull;
    },
    "log": function (this: StackMachine, ...message: PlStuff[]) {
        if (message.length == 0) {
            console.log('\n');
        } else {
            const combined = message.map(mess => PlToString(mess, this)).join(' ');
            console.log(combined);
        }
        return PlStuffNull;
    }
};

// FETCH STUFF
interface FetchOptions {
    method: string;
    headers: Record<string, string>;
    body: string;
}

interface FetchOutput {
    text: string;
    ok: boolean;
    status: number;
}

function sanitizeOptions(options: object): FetchOptions {
    const method = 'method' in options ? options["method"] : 'GET';
    const headers = 'headers' in options ? options["headers"] : {};
    const body = 'body' in options ? options["body"] : null;
    return {
        method,
        headers,
        body
    };
}

function callbackFetch(fetch) {
    return function (url, options, callback) {
        let d;
        fetch(url, options)
            .then(data => {
                d = data;
                return data.text();
            })
            .then(text => {
                callback(null, {
                    text,
                    ok: d.ok,
                    status: d.status,
                } as FetchOutput);
            })
            .catch(err => {
                callback(null, {
                    text: err.message,
                    ok: false,
                    status: err.status ? err.status : '404'
                } as FetchOutput);
            });
    }
}

if (isNode) {
    const deasync = require('deasync');

    const fetch = require('node-fetch');
    const syncFetch = deasync(callbackFetch(fetch));

    jsSpecial['fetch'] = GenerateJsGuardedFunction('fetch', ["string", "object"], function (this, url, options) {
        const opt = sanitizeOptions(options);
        return syncFetch(url, opt);
    });

    interface ExecOutput {
        ok: boolean;
        text: string;
    }

    const path = require('path');
    const fs = require('fs');
    const cp = require('child_process');
    jsSpecial['$'] = GenerateJsGuardedFunction("$", ["string", "string"], function (command, rel) {
        const targetPath = path.join(inout.paths.rootPath, rel);
        if (!fs.existsSync(targetPath)) {
            return {
                text: `the target path '${targetPath}' does not exist`,
                ok: false
            } as ExecOutput;
        }
        try {
            cp.execSync(command, {
                stdio: 'inherit',
                cwd: targetPath
            });
            return {
                text: "",
                ok: true,
            } as ExecOutput;
        } catch (e) {
            return {
                text: e.toString(),
                ok: false
            } as ExecOutput;
        }
    });
    jsSpecial['exec'] = GenerateJsGuardedFunction("exec", ["string", "string"], function (command, rel) {
        const targetPath = path.join(inout.paths.rootPath, rel);
        if (!fs.existsSync(targetPath)) {
            return {
                text: `the target path '${targetPath}' does not exist`,
                ok: false
            } as ExecOutput;
        }
        try {
            const out = cp.execSync(command, {
                stdio: [0, 'pipe', 'pipe'],
                cwd: targetPath
            }).toString();
            return {
                text: out,
                ok: true,
            } as ExecOutput;
        } catch (e) {
            return {
                text: e.toString(),
                ok: false
            } as ExecOutput;
        }
    })
} else {
    jsSpecial['fetch'] = GenerateJsGuardedFunction('fetch', ["string", "object"], function (this, url, options: FetchOptions) {
        const opt = sanitizeOptions(options);

        const request = new XMLHttpRequest();
        request.open(opt.method, url, false);

        for (const [key, value] of Object.entries(opt.headers)) {
            request.setRequestHeader(key, value);
        }
        request.send(opt.body);

        return {
            ok: Math.floor(request.status / 100) === 2,
            status: request.status,
            text: request.responseText
        } as FetchOutput;
    });
    // write $ jquery like selectors
    /*
    $body = $("body")
     */
    interface SelectorResult {
        _native: () => any; // native results
        text: () => string[];
        html: () => string[];
    }

    interface ListenCallbackEvent {
        preventDefault: () => void;
    }

    jsSpecial["$"] = GenerateJsGuardedFunction("$", ["string"], function (this, selector) {
        let result: HTMLElement[] = Array.from(document.querySelectorAll(selector)); // this closure might impact performance, but too bad
        const obj = {
            _native() {
                return result;
            },
            limit: GenerateJsGuardedFunction("limit", ["number"], function (amount) {
                if (amount >= result.length) {
                    return obj; // we dont have this as it is the stack machine
                }
                result = result.slice(amount);
                return obj;
            }),
            text() {
                return result.map(node => node.innerText);
            },
            setText: GenerateJsGuardedFunction("setText", ["string"], function (text) {
                result.forEach(node => {
                    node.innerText = text;
                })
                return obj;
            }),
            html() {
                return result.map(node => node.innerHTML);
            },
            setHTML: GenerateJsGuardedFunction("setHTML", ["string"], function (text) {
                result.forEach(node => {
                    node.innerHTML = text;
                })
                return obj;
            }),
            attr: GenerateJsGuardedFunction("attr", ["string"], function(attr) {
                return result.map(node => node[attr]);
            }),
            setAttr: GenerateJsGuardedFunction("attr", ["string", "*"], function(attr, value) {
                result.forEach(node => node[attr] = value);
                return obj;
            }),
            listen: GenerateJsGuardedFunction("listen", ["string", "function"], function (this: StackMachine, event, callback) {
                for (const node of result) {
                    node.addEventListener(event, (event: Event) => {
                        const e = {
                            preventDefault: event.preventDefault.bind(event),
                        } as ListenCallbackEvent;
                        callback(e);
                    });
                }
            })
        } as SelectorResult;
        return obj;
    })
}
