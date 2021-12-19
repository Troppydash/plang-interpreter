import {PlConverter} from "./converter";
import {
    NewPlStuff,
    PlStuff,
    PlStuffFalse,
    PlStuffNull,
    PlStuffTrue,
    PlStuffType,
    PlStuffTypeAny,
    PlStuffTypeRest
} from "../stuff";
import {AssertTypeof, GenerateGuardedFunction} from "./helpers";
import {StackMachine} from "../index"; // Hopefully this doesn't cause a circular dependency problem
import {MakeNoTypeFunctionMessage} from "./messeger";
import {ExportNative} from "./types";
import {isNode} from "../../../inout";
import PlToString = PlConverter.PlToString;
import VERSION = PlConverter.VERSION;

export const jsSpecial = {
    "range": GenerateGuardedFunction("range", [PlStuffTypeRest], function (start, end, step) {
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
    }),
    "try": GenerateGuardedFunction("try", [PlStuffType.Func, PlStuffType.Func], function (this: StackMachine, attempt, error) {
        const saved = this.saveState();
        try {
            return attempt();
        } catch (e) {
            this.restoreState(saved);
            return error(this.problems.pop());
        }
    }),
};

export const special: ExportNative = {
    "eval": GenerateGuardedFunction("eval", [PlStuffTypeAny], function (this: StackMachine, target: PlStuff) {
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
    "ask": GenerateGuardedFunction("ask", [PlStuffTypeRest], function (this: StackMachine, ...message: any) {
        const str = this.inout.input(message.map(m => PlToString(m, this)).join('\n'));
        if (str == null) {
            return PlStuffNull;
        }
        return NewPlStuff(PlStuffType.Str, str);
    }),
    "javascript": GenerateGuardedFunction("javascript", [PlStuffType.Str], function (this: StackMachine, code: PlStuff) {
        const _import = (function (key) {
            const value = this.findValue(key);
            if (value == null) {
                return null;
            }
            return PlConverter.PlToJs(value, this);
        }).bind(this);
        const _export = (function (key, value) {
            this.setValueInner(key, PlConverter.JsToPl(value, this));
            return null;
        }).bind(this);

        try {
            this.inout.execute(code.value, {
                de: {
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
    "panic": GenerateGuardedFunction("panic", [PlStuffTypeRest], function (...message: PlStuff[]) {
        throw new Error(message.map(m => PlToString(m, this)).join(' '));
    }),
    "say": GenerateGuardedFunction("say", [PlStuffTypeRest], function (this: StackMachine, ...message: PlStuff[]) {
        if (message.length == 0) {
            this.inout.print('\n');
        } else {
            const combined = message.map(mess => PlToString(mess, this)).join(' ');
            this.inout.print(combined);
        }
        return PlStuffNull;
    }),
    "log": GenerateGuardedFunction("log", [PlStuffTypeRest], function (this: StackMachine, ...message: PlStuff[]) {
        if (message.length == 0) {
            console.log('\n');
        } else {
            const combined = message.map(mess => PlToString(mess, this)).join(' ');
            console.log(combined);
        }
        return PlStuffNull;
    })
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
    const body = 'body' in options ? options["body"] : undefined;
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

    jsSpecial['fetch'] = GenerateGuardedFunction('fetch', [PlStuffType.Str, PlStuffType.Dict], function (this, url, options) {
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
    jsSpecial['$'] = GenerateGuardedFunction("$", [PlStuffType.Str, PlStuffType.Str], function (command, rel) {
        const targetPath = path.join(this.inout.paths.rootPath, rel);
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
    jsSpecial['exec'] = GenerateGuardedFunction("exec", [PlStuffType.Str, PlStuffType.Dict], function (command, rel) {
        const targetPath = path.join(this.inout.paths.rootPath, rel);
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
    });

    jsSpecial["require"] = GenerateGuardedFunction("require", [PlStuffType.Str], function (p: string) {
        try {
            if (/^\w+$/.test(p)) {
                return {
                    ok: true,
                    data: require(p),
                };
            }
            return {
                ok: true,
                data: require(path.join(this.inout.paths.rootPath, p)),
            };
        } catch (e) {
            return {
                ok: false,
                data: `cannot import js file '${p}'`
            };
        }
    });

    jsSpecial['sleep'] = GenerateGuardedFunction("sleep", [PlStuffType.Num], (duration) => {
        deasync((callback) => {
            setTimeout(() => {
                callback();
            }, duration * 1000);
        })();
        return null;
    });
} else {
    jsSpecial['sleep'] = GenerateGuardedFunction('sleep', [PlStuffType.Num], (duration) => {
        const syncWait = ms => {
            const end = Date.now() + ms
            while (Date.now() < end) continue
        }
        syncWait(duration * 1000);
    });

    jsSpecial['fetch'] = GenerateGuardedFunction('fetch', [PlStuffType.Str, PlStuffTypeRest], function (this, url, options: FetchOptions) {
        const opt = sanitizeOptions(options ? options : {});

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

    interface ListenCallbackEvent {
        preventDefault: () => void;
        location?: { x: number, y: number };
        key?: string;
        "#raw": any;
    }

    function nf(fn) {
        return NewPlStuff(PlStuffType.NFunc, fn);
    }


    function makeElement(items: HTMLElement[], selector: string, sm: StackMachine) {
        let result: HTMLElement[] = items;

        function toPl(any) {
            return PlConverter.JsToPl(any, sm);
        }

        let self = NewPlStuff(PlStuffType.Dict, {
            selector: selector,
            new: GenerateGuardedFunction("new", [], () => {
                result = [document.createElement(selector)];
                return self;
            }),
            attach: GenerateGuardedFunction("attach", [PlStuffType.Dict], function (node) {
                const nf = node.value['#raw'];
                if (!nf) {
                    throw new Error('cannot attach a none-node type');
                }
                const other = nf.value.get();
                result[0].appendChild(other.result[0]);
                return self;
            }),
            detach: GenerateGuardedFunction("detach", [PlStuffType.Dict], (node) => {
                const nf = node.value['#raw'];
                if (!nf) {
                    throw new Error('cannot detach a none-node type');
                }
                const other = nf.value.get();
                result[0].removeChild(other.result[0]);
                return self;
            }),
            clear: GenerateGuardedFunction("clear", [], () => {
                while (result[0].firstChild) {
                    result[0].firstChild.remove();
                }
                return self;
            }),
            setStyle: GenerateGuardedFunction("setStyle", [PlStuffType.Str, PlStuffType.Str], (attr, text) => {
                result[0].style[attr.value] = text.value;
                return self;
            }),
            removeStyle: GenerateGuardedFunction("removeStyle", [PlStuffType.Str], (attr) => {
                result[0].style[attr.value] = null;
                return self;
            }),
            class: GenerateGuardedFunction("class", [], () => {
                return NewPlStuff(PlStuffType.Str, result[0].className);
            }),
            setClass: GenerateGuardedFunction("setClass", [PlStuffType.Str], (newClass) => {
                result[0].className = newClass.value;
                return self;
            }),
            id: GenerateGuardedFunction("id", [], () => {
                return NewPlStuff(PlStuffType.Str, result[0].id);
            }),
            setId: GenerateGuardedFunction("setId", [PlStuffType.Str], (newId) => {
                result[0].id = newId.value;
                return self;
            }),
            any: GenerateGuardedFunction("any", [], () => result.length > 0 ? PlStuffTrue : PlStuffFalse),
            size: GenerateGuardedFunction("size", [], () => NewPlStuff(PlStuffType.Num, result.length)),
            all: GenerateGuardedFunction("all", [], function () {
                return NewPlStuff(PlStuffType.List, result.map(r => makeElement([r], selector, sm)));
            }),
            text: GenerateGuardedFunction("text", [], function () {
                return toPl(result[0].innerText);
            }),
            setText: GenerateGuardedFunction("setText", [PlStuffType.Str], function (text) {
                result[0].innerText = text.value;
                return self;
            }),
            html: GenerateGuardedFunction("text", [], function () {
                return toPl(result[0].innerHTML);
            }),
            setHtml: GenerateGuardedFunction("setHTML", [PlStuffType.Str], function (text) {
                result[0].innerHTML = text.value;
                return self;
            }),
            key: GenerateGuardedFunction("key", [PlStuffType.Str], function (attr) {
                return toPl(result[0][attr.value]);
            }),
            setKey: GenerateGuardedFunction("setKey", [PlStuffType.Str, PlStuffTypeAny], function (attr, value) {
                result[0][attr.value] = value.value;
                return self;
            }),
            attr: GenerateGuardedFunction("attr", [PlStuffType.Str], function (attr) {
                return toPl(result[0].getAttribute(attr.value));
            }),
            setAttr: GenerateGuardedFunction("setAttr", [PlStuffType.Str, PlStuffTypeAny], function (attr, value) {
                result[0].setAttribute(attr.value, value.value);
                return self;
            }),
            listen: GenerateGuardedFunction("listen", [PlStuffType.Str, PlStuffType.Func], function (event, callback) {
                let f;
                result[0].addEventListener(event.value, f = (event: any) => {
                    const e = {
                        preventDefault: () => event.preventDefault(),
                        "#raw": {
                            _version: VERSION,
                            type: "Raw",
                            value: event
                        },
                    } as ListenCallbackEvent;
                    if (event.currentTarget) {
                        e.location = {
                            x: event.clientX - event.currentTarget.getBoundingClientRect().left,
                            y: event.clientY - event.currentTarget.getBoundingClientRect().top,
                        }
                    }
                    if (event.key) {
                        e.key = event.key;
                    }
                    PlConverter.PlToJs(callback, sm)(e);
                });

                const node = result[0] as any;
                if (node.data == null) {
                    node.data = {};
                }
                const arr = node.data[event.value];
                if (arr != null) {
                    result[0].removeEventListener(event.value, arr);
                }
                node.data[event.value] = f;
                return self;
            }),
            unlisten: GenerateGuardedFunction("unlisten", [PlStuffType.Str], function (event) {
                const node = result[0] as any;
                if (node.data == null) {
                    node.data = {};
                }
                const arr = node.data[event.value];
                if (arr != null) {
                    result[0].removeEventListener(event.value, arr);
                    node.data[event.value] = undefined;
                }
                return self;
            }),
            children: GenerateGuardedFunction("children", [], () => {
                const out = [];
                for (const child of result[0].children) {
                    out.push(makeElement([child as HTMLElement], '', sm));
                }
                return NewPlStuff(PlStuffType.List, out);
            }),
            remove: GenerateGuardedFunction("remove", [PlStuffType.Num], (index) => {
                const idx = index.value - 1;
                result[0].removeChild(result[0].children[idx]);
                return self;
            }),
            insert: GenerateGuardedFunction("insert", [PlStuffType.Num, PlStuffTypeAny], (index, node) => {
                const nf = node.value['#raw'];
                if (!nf) {
                    throw new Error('cannot detach a none-node type');
                }
                const idx = index.value - 1;
                if (idx == result[0].children.length) {
                    return self.value["attach"].value.native(node);
                }

                const other = nf.value.get();
                result[0].insertBefore(other.result[0], result[0].children[idx]);
                return self;
            }),
            $: GenerateGuardedFunction("$", [PlStuffType.Str], (selector) => {
                return makeElement(Array.from(result[0].querySelectorAll(selector.value)), selector.value, sm);
            }),
            parent: GenerateGuardedFunction("parent", [], () => {
                return makeElement([result[0].parentElement], selector + ":parent", sm);
            })
        });
        for (const key of Object.keys(self.value)) {
            self.value[key] = nf(self.value[key]);
        }
        self.value["#raw"] = NewPlStuff(PlStuffType.Raw, {
            get() {
                return {
                    result,
                }
            }
        })
        return self;
    }

    // TODO: write this in instance instead of dict
    special["$"] = GenerateGuardedFunction("$", [PlStuffType.Str], function (this: StackMachine, selector) {
        const sm = this;
        return makeElement(Array.from(document.querySelectorAll(selector.value)), selector.value, sm);
    })
}
