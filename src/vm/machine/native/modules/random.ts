import { AssertTypeof, GenerateJsGuardedFunction } from "../helpers";

function randomNumber(lower, upper) {
    if (lower != null) {
        AssertTypeof("number", lower, "number", 1);
    }
    if (upper != null) {
        AssertTypeof("number", upper, "number", 2);
    }

    if (lower == null && upper == null) {
        lower = 1;
        upper = 100;
    } else if (upper == null) {
        upper = lower;
        lower = 1;
    } else if (lower == null) {
        lower = 1;
    }

    return Math.floor(Math.random() * (upper - lower + 1) + lower);
}

export const random = {
    random: {
        number: randomNumber,
        list: function(n, lower, upper) {
            if (n == null) {
                n = 10;
            }
            // TODO: make this lower upper known
            let out = [];
            for (let i = 0; i < n; i++) {
                out.push(randomNumber(lower, upper));
            }

            return out;
        }
    }
};
