/**
 * This prepares the blessed module and is required to be called before any other usage of this module
 * @constructor
 */
import {isNode} from "../../inout";

export function IACTPrepare(): boolean {
    if (!isNode) {
        return false;
    }
    try {
        require('blessed');
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Sync a promise
 * @param fn
 * @constructor
 */
export function IACTSync(fn: Promise<any>): any {
    const deasync = require('deasync');

    return deasync(function (callback) {
        fn
            .then(res => {
                callback(res);
            })
            .catch(err => {
                callback(err);
            });
    })();
}
