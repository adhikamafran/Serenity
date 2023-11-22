﻿const globalObj: any = 
    (typeof globalThis !== "undefined" && globalThis) || 
    (typeof window !== "undefined" && window) || 
    (typeof self !== "undefined" && self) ||
    // @ts-ignore check for global
    (typeof global !== "undefined" && global) ||
    (function () { return this; })() || Function('return this')();

export function getGlobalThis(): any {
    return globalObj;
}

const fallbackStore: any = {};

export function getStateStore(key?: string): any {

    let store: any;
    if (globalObj) {
        if (!globalObj.Q)
            globalObj.Q = {};

        store = globalObj.Q.__stateStore;
        if (!store)
            globalObj.Q.__stateStore = store = Object.create(null);
    }
    else
        store = fallbackStore;

    if (key == null)
        return store;

    var s = store[key];
    if (s == null)
        store[key] = s = Object.create(null);
    return s;
}

export function getTypeStore() {
    return getStateStore("__types");
}

interface TypeExt {
    __interface?: boolean;
    __interfaces?: any[];
    __isAssignableFrom?: (from: any) => boolean;
    __isInstanceOfType?: (instance: any) => boolean;
    __metadata?: TypeMetadata;
    __typeName?: string;
}

interface TypeMetadata {
    enumFlags?: boolean;
    attr?: any[];
}

export type Type = Function | Object;

export function ensureMetadata(target: Type): TypeMetadata {

    if (!Object.prototype.hasOwnProperty.call(target, '__metadata') ||
        !(target as TypeExt).__metadata) {
        (target as TypeExt).__metadata = Object.create(null);
    }

    return (target as TypeExt).__metadata;
}

export function getNested(from: any, name: string) {
    var a = name.split('.');
    for (var i = 0; i < a.length; i++) {
        from = from[a[i]];
        if (from == null)
            return null;
    }
    return from;
}

export function getType(name: string, target?: any): Type  {
    var type: any;
    const types = getTypeStore();
    if (target == null) {
        type = types[name];
        if (type != null || globalObj == void 0 || name === "Object")
            return type;

        target = globalObj;
    }

    type = getNested(target, name)
    if (typeof type !== 'function')
        return null;

    return type;
}

export function getTypeNameProp(type: Type): string {
    return (Object.prototype.hasOwnProperty.call(type, "__typeName") && (type as TypeExt).__typeName) || void 0;
}

export function setTypeNameProp(type: Type, value: string) {
    Object.defineProperty(type, "__typeName", { value, configurable: true });
}

export function getTypeFullName(type: Type): string {
    return getTypeNameProp(type) || (type as any).name ||
        (type.toString().match(/^\s*function\s*([^\s(]+)/) || [])[1] || 'Object';
};

export function getTypeShortName(type: Type): string {
    var fullName = getTypeFullName(type);
    var bIndex = fullName.indexOf('[');
    var nsIndex = fullName.lastIndexOf('.', bIndex >= 0 ? bIndex : fullName.length);
    return nsIndex > 0 ? fullName.substr(nsIndex + 1) : fullName;
};

export function getInstanceType(instance: any): any {
    if (instance == null)
        throw "Can't get instance type of null or undefined!";

    // Have to catch as constructor cannot be looked up on native COM objects
    try {
        return instance.constructor;
    }
    catch (ex) {
        return Object;
    }
};

export function isAssignableFrom(target: any, type: Type) {
    if (target === type || (type as any).prototype instanceof target)
        return true;

    if (typeof (target as TypeExt).__isAssignableFrom === 'function')
        return (target as TypeExt).__isAssignableFrom(type);

    return false;
};

export function isInstanceOfType(instance: any, type: Type) {
    if (instance == null)
        return false;

    if (typeof (type as TypeExt).__isInstanceOfType === 'function')
        return (type as TypeExt).__isInstanceOfType(instance);

    return isAssignableFrom(type, getInstanceType(instance));
};

export function getBaseType(type: any) {
    if (type === Object ||
        !type.prototype ||
        (type as TypeExt).__interface === true) {
        return null;
    }
    else if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(type.prototype).constructor;
    }
    else {
        var p = type.prototype;
        if (Object.prototype.hasOwnProperty.call(p, 'constructor')) {
            try {
                var ownValue = p.constructor;
                delete p.constructor;
                return p.constructor;
            }
            finally {
                p.constructor = ownValue;
            }
        }
        return p.constructor;
    }
};

function merge(arr1: any[], arr2: any[]) {
    if (!arr1 || !arr2)
        return (arr1 || arr2 || []).slice();

    function distinct(arr: any[]) {
        return arr.filter((item, pos) => arr.indexOf(item) === pos);
    }        

    return distinct(arr1.concat(arr2));
}

function interfaceIsAssignableFrom(from: any) {
    return from != null && 
        Array.isArray((from as TypeExt).__interfaces) && 
        (from as TypeExt).__interfaces.some(x => 
            x === this ||
            (getTypeNameProp(this)?.length && 
                x.__interface &&
                getTypeNameProp(x) === this.__typeName));
}

function registerType(type: any, name: string, intf: any[]) {
    const types = getTypeStore();
    if (name && name.length) {
        setTypeNameProp(type, name);
        types[name] = type;
    }
    else if (getTypeNameProp(type as TypeExt)?.length)
        types[(type as TypeExt).__typeName] = type;

    if (intf != null && intf.length)
        Object.defineProperty(type, "__interfaces", {
            value: merge((type as TypeExt).__interfaces, intf),
            configurable: true
        });
}

export function registerClass(type: any, name: string, intf?: any[]) {
    registerType(type, name, intf);
    Object.defineProperty(type, "__interface", { value: false, configurable: true });
}

export function registerEnum(type: any, name: string, enumKey?: string) {
    registerType(type, name, undefined);
    if (enumKey && enumKey != name) {
        const types = getTypeStore();
        if (!types[enumKey])
            types[enumKey] = type;
    }
    Object.defineProperty(type, "__interface", { value: null, configurable: true });
}

export function registerInterface(type: any, name: string, intf?: any[]) {
    registerType(type, name, intf);
    Object.defineProperty(type, "__interface", { value: true, configurable: true });
    Object.defineProperty(type, "__isAssignableFrom", { value: interfaceIsAssignableFrom, configurable: true });
}

export namespace Enum {
    export let toString = (enumType: any, value: number): string => {
        var values = enumType;
        if (value === 0 || !((enumType as TypeExt).__metadata?.enumFlags)) {
            for (var i in values) {
                if (values[i] === value) {
                    return i;
                }
            }
            return value == null ? "" : value.toString();
        }
        else {
            var parts: string[] = [];
            for (var i in values) {
                if (values[i] & value) {
                    parts.push(i);
                }
                else
                    parts.push(value == null ? "" : value.toString());
            }
            return parts.join(' | ');
        }
    };

    export let getValues = (enumType: any) => {
        var parts = [];
        var values = enumType;
        for (var i in values) {
            if (Object.prototype.hasOwnProperty.call(values, i) &&
                typeof values[i] === "number")
                parts.push(values[i]);
        }
        return parts;
    };
}

export let isEnum = (type: any) => {
    return typeof type !== "function" &&
        (type as TypeExt).__interface === null;
};

export function initFormType(typ: Function, nameWidgetPairs: any[]) {
    for (var i = 0; i < nameWidgetPairs.length - 1; i += 2) {
        (function (name: string, widget: any) {
            Object.defineProperty(typ.prototype, name, {
                get: function () {
                    return this.w(name, widget);
                },
                enumerable: true,
                configurable: true
            });
        })(nameWidgetPairs[i], nameWidgetPairs[i + 1]);
    }
}

const _fieldsProxy = new Proxy({}, { get: (_, p) => p }) as any;

export function fieldsProxy<TRow>(): Readonly<Record<keyof TRow, string>> {
    return _fieldsProxy
}

export {}