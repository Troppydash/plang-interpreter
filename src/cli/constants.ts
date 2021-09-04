import {Inout, isNode} from "../inout";

export let PNAME = null;

if (isNode) {
    const path = require('path');
    PNAME = path.relative(Inout().paths.cliPath, process.argv[0]);
    if (process.platform == "win32") {
        PNAME += ".exe";
    } else {
        PNAME = `./${PNAME}`;
    }
}
