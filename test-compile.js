"use strict";
var DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function stripDangerousKeys(value) {
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(function (item) { return stripDangerousKeys(item); });
    }
    var obj = value;
    var result = {};
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var key = _a[_i];
        if (DANGEROUS_KEYS.has(key))
            continue;
        result[key] = stripDangerousKeys(obj[key]);
    }
    return result;
}
