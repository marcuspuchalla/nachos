/* tslint:disable */
/* eslint-disable */

/**
 * Returns a `ast::CDDL` wrapped in `JsValue` from a `&str`
 *
 * # Arguments
 *
 * * `input` - A string slice with the CDDL text input
 *
 * # Example
 *
 * ```typescript
 * import * as wasm from 'cddl';
 *
 * let cddl: any;
 * try {
 *   cddl = wasm.cddl_from_str(text);
 * } catch (e) {
 *   console.error(e);
 * }
 * ```
 */
export function cddl_from_str(input: string): any;

/**
 * Validate CBOR slice from a given CDDL document string
 */
export function validate_cbor_from_slice(cddl: string, cbor_slice: Uint8Array, enabled_features?: any[] | null): any;

/**
 * Validate CDDL input with partial compilation support.
 *
 * Unlike `cddl_from_str` which stops at the first error, this function
 * performs partial compilation: when the full document parse fails, it splits
 * the source into individual top-level rule blocks and parses each one
 * independently, collecting **all** errors across the entire document.
 *
 * When `check_refs` is `true`, the function also checks for undefined
 * references — names used in type expressions or group entries that are not
 * defined by any rule in the document and are not standard prelude types.
 * These are reported as warnings rather than errors.
 *
 * Returns a `JsValue` (serialised JSON array) containing all diagnostics found.
 * Each entry has `{ position, msg, severity }` where severity is `"error"` or `"warning"`.
 * An empty array means the input is valid CDDL with no warnings.
 *
 * # Example
 *
 * ```typescript
 * import * as wasm from 'cddl';
 *
 * const errors = wasm.validate_cddl_from_str(text, true);
 * // errors is an Array<{ position, msg, severity }>
 * if (errors.length === 0) {
 *   console.log('Valid CDDL');
 * }
 * ```
 */
export function validate_cddl_from_str(input: string, check_refs: boolean): any;

/**
 * Validate CSV string from a given CDDL document string
 */
export function validate_csv_from_str(cddl: string, csv_data: string, has_header?: boolean | null, enabled_features?: any[] | null): any;

/**
 * Validate JSON string from a given CDDL document string
 */
export function validate_json_from_str(cddl: string, json: string, enabled_features?: any[] | null): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly validate_cbor_from_slice: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly validate_json_from_str: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly validate_csv_from_str: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly cddl_from_str: (a: number, b: number) => [number, number, number];
    readonly validate_cddl_from_str: (a: number, b: number, c: number) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
