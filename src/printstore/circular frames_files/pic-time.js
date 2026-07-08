"use strict";
{
    var bablic_1;
    var i18n_1;
    if (typeof (exports) !== "undefined") {
        bablic_1 = module.exports;
        i18n_1 = require("./integrate-i18n").integrateI18n;
    }
    else {
        bablic_1 = window.bablic || {};
        window.bablic = bablic_1;
        i18n_1 = bablic_1.integrateI18n;
    }
    bablic_1.page = null;
    bablic_1.useLegacyMutation = true;
    var alreadyProcessed_1 = new Set();
    var textItems_1;
    // this tells if we are encoding and decoding key on client side.
    // this turns on only if preprocessI18n was called on client side.
    var reverseKeys_1 = {};
    var keyCounter = 0;
    var keptKeys_1 = [];
    var originalKeys_1 = [];
    var debug_1 = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        (_a = console.log).call.apply(_a, [console].concat(args));
    };
    bablic_1.preprocessI18n = function (page, obj) {
        // if not in editor, stop now
        if (!bablic_1.preview) {
            return obj;
        }
        /**
         * Decode phrase key. If encoding is not on, just return the key.
         * Otherwise map the index to a stored key.
         * @param {string} key
         * @returns {string}
         */
        i18n_1.decodeKey = function (key) {
            // get decoded key
            var index = Number(key);
            if (index == NaN) {
                console.error("Unexpected key", key);
                return key;
            }
            return keptKeys_1[index];
        };
        // set page
        if (bablic_1.setPage) {
            // bablic.setPage(page[0] === "/" ? page : "/" + page + "/");
            bablic_1.setPage("*");
        }
        // start bablic to fetch contents
        if (bablic_1.start) {
            bablic_1.start();
        }
        else {
            window.document.addEventListener("bablicload", function () {
                bablic_1.setPage(page[0] === "/" ? page : "/" + page + "/");
                bablic_1.start();
            });
        }
        if (alreadyProcessed_1.has(page)) {
            return obj;
        }
        alreadyProcessed_1.add(page);
        debug_1("process item of", page);
        try {
            textItems_1 = [];
            obj = iterateObj_1(obj);
        }
        catch (e) {
            debug_1("Failed", e);
            return obj;
        }
        if (bablic_1.ldata && bablic_1.ldata.content) {
            activateContents_1(textItems_1);
        }
        else if (bablic_1.on) {
            bablic_1.on("done", function () {
                activateContents_1(textItems_1);
            });
        }
        else {
            var interval_1;
            interval_1 = setInterval(function () {
                if (bablic_1.ldata && bablic_1.ldata.content) {
                    clearInterval(interval_1);
                    activateContents_1(textItems_1);
                }
            }, 100);
        }
        return obj;
    };
    /**
     * Walk over language object, and wrap text values with tokens
     * @param obj
     * ILanguageObject
     * @param namespace
     * For recursive
     * @returns {ILanguageObject}
     */
    var iterateObj_1 = function (obj, namespace) {
        if (namespace === void 0) { namespace = ""; }
        for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
            var key = _a[_i];
            var name_1 = namespace + key;
            obj[key] = wrapValue_1(obj[key], name_1);
        }
        return obj;
    };
    /**
     * Encode phrase key to number. This minimize the chance of external code will
     * conflict with our own
     * @param {string} key
     * @param {string} originalValue
     * @returns {string}
     */
    var encodeKey_1 = function (key, originalValue) {
        if (!(key in reverseKeys_1)) {
            var index = keptKeys_1.length;
            keptKeys_1.push(key);
            originalKeys_1.push(originalValue);
            reverseKeys_1[key] = index;
        }
        return reverseKeys_1[key] + "";
    };
    /**
     * Wraps text value with Bablic tokens
     * @param val
     * original content string
     * @param name
     * language object key
     * @returns string
     * Text with tokens
     */
    var wrapValue_1 = function (val, name) {
        if (!val) {
            return val;
        }
        if (Array.isArray(val)) {
            return val;
        }
        //     return iterateArray(val, name ? name + "." : "");
        if (typeof (val) === "object") {
            return val;
        }
        //     return iterateObj(val, name ? name + "." : "");
        // val = BASE_TAG + START_TAG + "(key=[" + name + "])__" + wrapVariables(val) + BASE_TAG + END_TAG;
        val = i18n_1.startTag + encodeKey_1(name, val) + i18n_1.innerStartTag + wrapVariables_1(val) + i18n_1.endTag;
        textItems_1.push(val);
        return val;
    };
    /**
     * Run the phrases via gettext to make sure Bablic records them
     * @param items
     */
    var activateContents_1 = function (items) {
        var div = document.createElement("DIV");
        items.forEach(function (item) {
            var subDiv = document.createElement("DIV");
            subDiv.innerHTML = item;
            subDiv._fake = true;
            subDiv.childNodes[0]._fake = true;
            div.appendChild(subDiv);
        });
        bablic_1.setMutationListen(false);
        div.style.display = "none";
        document.body.appendChild(div);
        bablic_1.processElement(div);
        document.body.removeChild(div);
        bablic_1.setMutationListen(true);
    };
    /**
     * Make sure variables inside translation are detected as Variables in Bablic
     * @param text
     * Content that might have variables
     * @returns {string}
     */
    var wrapVariables_1 = function (text) {
        if (!text) {
            return "";
        }
        // keep aside everything that it inside HTML tag
        var keepCodes = [];
        var keepCodeFunc = function (all) {
            keepCodes.push(all);
            return " babkeep" + (keepCodes.length - 1) + "b ";
        };
        // clear scripts
        text = text.replace(/<script[^>]*>(.|\s)*?<\/script>/gi, keepCodeFunc);
        // clear styles
        text = text.replace(/<style[^>]*>(.|\s)*?<\/style>/gi, keepCodeFunc);
        // clear HTML tags
        // text = text.replace(/<\/?[a-z][^>]*>/gi, keepCodeFunc);
        // special variable regex for pic-time
        // regex match either:
        // 1) non variable char (or start) + Underscore + some variable chars + non variable char (or end) (_PT_VAR, ... _3x10)
        // 2) bracket start + (optional bracket start) + some variable chars + (optional end bracket) + end bracket  ( {0}, {productype}, {{1}}, ...)
        text = text.replace(/(?:([^a-zA-Z0-9\._]|^)_([A-Z0-9][a-zA-Z0-9_\.]+?)([^a-zA-Z0-9_\.]|$))|(?:\{\{?([a-zA-Z0-9_\.]+)\}?\})/g, function (all, underscoreCharBefore, underscoreVariableValue, underscoreCharAfter, bracketVariableValue) {
            if (underscoreVariableValue) {
                return (underscoreCharBefore || "") + i18n_1.varStart + underscoreVariableValue + i18n_1.varMiddle + "_" + underscoreVariableValue +
                    i18n_1.varEnd + (underscoreCharAfter || "");
            }
            return i18n_1.varStart + bracketVariableValue + i18n_1.varMiddle + all + i18n_1.varEnd;
        });
        if (keepCodes.length) {
            text = text.replace(/ babkeep(\d+)b /g, function (a, num) { return keepCodes[Number(num)]; });
        }
        return text;
    };
    if (typeof (exports) !== "undefined") {
        module.exports.wrapVariables = wrapVariables_1;
    }
}
