"use strict";
const electron = require("electron");
const PRESENTATION_CHANNEL = "frade:presentation";
const PRESENTATION_BOOT_CHANNEL = "frade:presentation-boot";
const PRESENTATION_MAX_BYTES = 32 * 1024;
const presentationRoles = [
  "surface.base",
  "surface.panel",
  "surface.rail",
  "surface.hover",
  "surface.overlay",
  "text.primary",
  "text.secondary",
  "text.disabled",
  "border.subtle",
  "border.control",
  "action.primary",
  "action.primaryHover",
  "action.onPrimary",
  "selection.bg",
  "selection.fg",
  "selection.indicator",
  "focus.ring",
  "status.success",
  "status.successBg",
  "status.warning",
  "status.warningBg",
  "status.error",
  "status.errorBg",
  "status.info",
  "status.infoBg",
  "diagram.canvas",
  "diagram.grid",
  "diagram.nodeBg",
  "diagram.nodeStroke",
  "diagram.edge",
  "diagram.selection"
];
const kinds = ["light", "dark", "high-contrast"];
const roles = new Set(presentationRoles);
function invalid() {
  throw new Error("INVALID_PRESENTATION");
}
function data(value) {
  let count = 0;
  const visiting = /* @__PURE__ */ new Set();
  function walk(item, depth) {
    if (++count > 5e3 || depth > 16) invalid();
    if (item === null || typeof item === "boolean") return;
    if (typeof item === "string") {
      if (item.length > 8192) invalid();
      return;
    }
    if (typeof item === "number") {
      if (!Number.isFinite(item)) invalid();
      return;
    }
    if (!item || typeof item !== "object" || visiting.has(item) || Object.getOwnPropertySymbols(item).length)
      invalid();
    const array = Array.isArray(item), prototype = Object.getPrototypeOf(item);
    if (prototype !== (array ? Array.prototype : Object.prototype) && !(prototype === null && !array))
      invalid();
    const descriptors = Object.getOwnPropertyDescriptors(item);
    if (Object.values(descriptors).some((descriptor) => !("value" in descriptor))) invalid();
    if (array && (Object.keys(item).length !== item.length || Object.keys(item).some((key) => !/^\d+$/.test(key))))
      invalid();
    visiting.add(item);
    for (const [key, descriptor] of Object.entries(descriptors))
      if (descriptor.enumerable) {
        if (key.length > 128) invalid();
        walk(descriptor.value, depth + 1);
      }
    visiting.delete(item);
  }
  walk(value, 0);
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > PRESENTATION_MAX_BYTES) invalid();
}
function fields$1(value, required, optional = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const object = value;
  if (required.some((key) => !Object.hasOwn(object, key)) || Object.keys(object).some((key) => !required.includes(key) && !optional.includes(key)))
    invalid();
  return object;
}
function integer(value) {
  if (!Number.isSafeInteger(value) || value < 0) invalid();
}
function text(value, max = 160) {
  if (typeof value !== "string" || value.length < 1 || value.length > max || [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))
    invalid();
}
function identity(value) {
  text(value);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) || value.split("/").some((part) => !part || part === "." || part === ".."))
    invalid();
}
function themeId(value) {
  text(value);
  if (!kinds.some((kind) => value === "frade.builtin/" + kind) && !/^[a-z0-9][a-z0-9.-]*\.[a-z0-9][a-z0-9.-]*[/][a-z0-9][a-z0-9._-]*$/i.test(value))
    invalid();
}
function owned(value) {
  const result = structuredClone(value);
  function freeze(item) {
    if (item && typeof item === "object") {
      for (const child of Object.values(item)) freeze(child);
      Object.freeze(item);
    }
  }
  freeze(result);
  return result;
}
function choice(value) {
  const object = fields$1(value, ["mode", "density", "preferred"]);
  if (!["system", ...kinds].includes(String(object.mode)) || !["compact", "comfortable"].includes(String(object.density)))
    invalid();
  const preferred = fields$1(object.preferred, kinds);
  for (const kind of kinds) themeId(preferred[kind]);
}
function persisted(value) {
  const object = fields$1(value, ["version", "revision", "generation", "transactionId", "selection"]);
  if (object.version !== 1) invalid();
  integer(object.revision);
  integer(object.generation);
  identity(object.transactionId);
  choice(object.selection);
}
function phase(value) {
  const object = fields$1(value, [
    "version",
    "requestId",
    "sessionId",
    "generation",
    "transactionId",
    "revision",
    "membership",
    "phase"
  ]);
  if (object.version !== 1 || !["prepare", "apply", "rollback", "join"].includes(String(object.phase)))
    invalid();
  for (const key of ["requestId", "sessionId", "transactionId"]) identity(object[key]);
  if (object.requestId !== object.transactionId) invalid();
  for (const key of ["generation", "revision", "membership"]) integer(object[key]);
}
function presentationSystemColor(role) {
  if ([
    "action.primary",
    "action.primaryHover",
    "selection.bg",
    "selection.indicator",
    "focus.ring",
    "diagram.selection"
  ].includes(role))
    return "Highlight";
  if (role === "action.onPrimary" || role === "selection.fg") return "HighlightText";
  return role.startsWith("surface.") || role.endsWith("Bg") || role === "diagram.canvas" ? "Canvas" : "CanvasText";
}
function snapshot(value) {
  const object = fields$1(value, [
    "id",
    "label",
    "kind",
    "density",
    "revision",
    "colors",
    "effectiveColors",
    "forcedColors",
    "status",
    "repairPasses",
    "issues",
    "compatibility"
  ]);
  themeId(object.id);
  text(object.label);
  integer(object.revision);
  integer(object.repairPasses);
  if (!kinds.includes(object.kind) || !["compact", "comfortable"].includes(String(object.density)) || typeof object.forcedColors !== "boolean" || !["VALID", "REPAIRED", "FALLBACK"].includes(String(object.status)) || object.repairPasses > 10)
    invalid();
  const colors = fields$1(object.colors, presentationRoles), effective = fields$1(object.effectiveColors, presentationRoles);
  for (const role of presentationRoles) {
    if (typeof colors[role] !== "string" || !/^#[0-9a-f]{6}$/i.test(colors[role]) || effective[role] !== (object.forcedColors ? presentationSystemColor(role) : colors[role]))
      invalid();
  }
  if (!Array.isArray(object.issues) || object.issues.length > 128) invalid();
  for (const item of object.issues) {
    const diagnostic = fields$1(item, ["code", "source", "message"], ["role"]);
    text(diagnostic.code);
    text(diagnostic.source);
    text(diagnostic.message, 512);
    if (Object.hasOwn(diagnostic, "role")) text(diagnostic.role);
  }
  const compatibility = fields$1(object.compatibility, ["recognized", "ignored", "repaired"]);
  for (const key of ["recognized", "ignored", "repaired"]) {
    const values = compatibility[key];
    if (!Array.isArray(values) || values.length > 128 || new Set(values).size !== values.length)
      invalid();
    for (const role of values) {
      text(role);
      if (key !== "ignored" && !roles.has(role)) invalid();
    }
  }
}
function parsePresentationBoot(value) {
  data(value);
  const object = fields$1(value, [
    "version",
    "sessionId",
    "bootRevision",
    "snapshot",
    "durable",
    "diagnostics"
  ]);
  if (object.version !== 1) invalid();
  identity(object.sessionId);
  integer(object.bootRevision);
  snapshot(object.snapshot);
  persisted(object.durable);
  const snap = object.snapshot, durable = object.durable;
  if (snap.revision !== object.bootRevision || snap.density !== durable.selection.density || durable.selection.mode !== "system" && snap.kind !== durable.selection.mode)
    invalid();
  if (!Array.isArray(object.diagnostics) || object.diagnostics.length > 128) invalid();
  for (const diagnostic of object.diagnostics) text(diagnostic, 512);
  return owned(value);
}
function parsePresentationRequest(value) {
  data(value);
  const object = fields$1(value, ["version", "sessionId", "requestId", "operation", "payload"]);
  if (object.version !== 1) invalid();
  identity(object.sessionId);
  identity(object.requestId);
  switch (object.operation) {
    case "intent":
      fields$1(object.payload, []);
      break;
    case "stage":
    case "persist": {
      const payload = fields$1(object.payload, ["context", "selection", "expectedRevision"]);
      phase(payload.context);
      choice(payload.selection);
      integer(payload.expectedRevision);
      const context = payload.context;
      if (context.sessionId !== object.sessionId || context.requestId !== object.requestId || context.phase !== (object.operation === "stage" ? "prepare" : "apply"))
        invalid();
      break;
    }
    case "reconcile": {
      const payload = fields$1(object.payload, ["context", "lastPublished"]);
      phase(payload.context);
      persisted(payload.lastPublished);
      const context = payload.context;
      if (context.sessionId !== object.sessionId || context.requestId !== object.requestId || context.phase !== "rollback")
        invalid();
      break;
    }
    case "ready": {
      const payload = fields$1(object.payload, ["bootRevision", "rootRevision"]);
      integer(payload.bootRevision);
      integer(payload.rootRevision);
      if (payload.bootRevision !== payload.rootRevision) invalid();
      break;
    }
    default:
      invalid();
  }
  return owned(value);
}
function sameChoice(a, b) {
  return a.mode === b.mode && a.density === b.density && kinds.every((kind) => a.preferred[kind] === b.preferred[kind]);
}
function parsePresentationResponse(value, requestInput) {
  const request = parsePresentationRequest(requestInput);
  data(value);
  switch (request.operation) {
    case "intent": {
      const response = fields$1(value, ["generation"]);
      integer(response.generation);
      if (response.generation === 0) invalid();
      break;
    }
    case "stage": {
      const response = fields$1(value, ["status"], ["message"]);
      if (response.status === "STAGED") fields$1(value, ["status"]);
      else if (response.status === "REFUSED" || response.status === "UNKNOWN") {
        fields$1(value, ["status", "message"]);
        text(response.message, 512);
      } else invalid();
      break;
    }
    case "persist": {
      if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
      const status = value.status;
      if (status === "ACK") {
        const response = fields$1(value, ["status", "durable"]);
        persisted(response.durable);
        const durable = response.durable, context = request.payload.context;
        if (durable.revision <= request.payload.expectedRevision || durable.generation !== context.generation || durable.transactionId !== context.transactionId || !sameChoice(durable.selection, request.payload.selection))
          invalid();
      } else if (status === "REFUSED" || status === "UNKNOWN") {
        const response = fields$1(value, ["status", "message"]);
        text(response.message, 512);
      } else invalid();
      break;
    }
    case "reconcile": {
      persisted(value);
      const durable = value, published = request.payload.lastPublished, context = request.payload.context;
      if (!sameChoice(durable.selection, published.selection) || durable.revision < published.revision)
        invalid();
      if (durable.revision === published.revision) {
        if (durable.generation !== published.generation || durable.transactionId !== published.transactionId)
          invalid();
      } else if (durable.generation !== context.generation || durable.transactionId !== context.transactionId)
        invalid();
      break;
    }
    case "ready": {
      const response = fields$1(value, ["version", "ready"]);
      if (response.version !== 1 || response.ready !== true) invalid();
    }
  }
  return owned(value);
}
const REQUEST_CHANNEL = "frade:health";
const EVENT_CHANNEL = "frade:health-event";
const errorCodes = [
  "INVALID_REQUEST",
  "VERSION_MISMATCH",
  "UNKNOWN_OPERATION",
  "UNAUTHORIZED",
  "UNAVAILABLE",
  "TIMEOUT",
  "CANCELLED",
  "PROTOCOL_ERROR",
  "SHUTTING_DOWN"
];
class RuntimeError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
    this.name = "RuntimeError";
  }
}
const record$1 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v, expected) => Object.keys(v).length === expected.length && expected.every((k) => Object.hasOwn(v, k));
const validId = (v) => typeof v === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(v);
function parseHealth(v) {
  if (!record$1(v) || !keys(v, ["state", "sequence"]) || !["starting", "ready", "unavailable", "stopping"].includes(String(v.state)) || !Number.isSafeInteger(v.sequence) || v.sequence < 0)
    throw new RuntimeError("PROTOCOL_ERROR");
  return v;
}
function parseBackendMessage(v) {
  if (!record$1(v) || v.protocolVersion !== 1) throw new RuntimeError("PROTOCOL_ERROR");
  if (v.type === "ready" && keys(v, ["type", "protocolVersion"])) return v;
  if (v.type !== "response" || !validId(v.requestId)) throw new RuntimeError("PROTOCOL_ERROR");
  if (v.ok === true && keys(v, ["type", "protocolVersion", "requestId", "ok", "result"])) {
    parseHealth(v.result);
    return v;
  }
  if (v.ok === false && keys(v, ["type", "protocolVersion", "requestId", "ok", "error"]) && errorCodes.includes(v.error))
    return v;
  throw new RuntimeError("PROTOCOL_ERROR");
}
function parseHealthEvent(v) {
  if (!record$1(v) || !keys(v, ["type", "protocolVersion", "health"]) || v.type !== "health" || v.protocolVersion !== 1)
    throw new RuntimeError("PROTOCOL_ERROR");
  parseHealth(v.health);
  return v;
}
function healthRequest(requestId) {
  return { type: "request", protocolVersion: 1, requestId, operation: "health.get", payload: {} };
}
function createDesktopApi(invoke, subscribe, id) {
  return {
    runtime: {
      async getHealth() {
        const request = healthRequest(id());
        const response = parseBackendMessage(await invoke(request));
        if (response.type !== "response" || response.requestId !== request.requestId)
          throw new RuntimeError("PROTOCOL_ERROR");
        if (!response.ok) throw new RuntimeError(response.error);
        return response.result;
      }
    },
    events: {
      subscribe(listener) {
        let active = true, last = -1;
        const off = subscribe((value) => {
          if (!active) return;
          try {
            const event = parseHealthEvent(value);
            if (event.health.sequence <= last) return;
            last = event.health.sequence;
            listener(event.health);
          } catch {
          }
        });
        return () => {
          active = false;
          off();
        };
      }
    }
  };
}
function createPresentationApi(bootInput, invoke, id) {
  const boot = parsePresentationBoot(bootInput);
  let acceptedGeneration = boot.durable.generation;
  const request = async (input) => {
    const value = parsePresentationRequest(input);
    if (value.sessionId !== boot.sessionId) throw Error("UNAUTHORIZED_SESSION");
    return parsePresentationResponse(await invoke(value), value);
  };
  return Object.freeze({
    getBoot: () => parsePresentationBoot(boot),
    announceIntent: async (requestId) => {
      const response = await request({
        version: 1,
        sessionId: boot.sessionId,
        requestId,
        operation: "intent",
        payload: {}
      });
      if (response.generation <= acceptedGeneration) throw Error("STALE_PRESENTATION_INTENT");
      acceptedGeneration = response.generation;
      return response;
    },
    stage: async (context, selection, expectedRevision) => await request({
      version: 1,
      sessionId: boot.sessionId,
      requestId: context.requestId,
      operation: "stage",
      payload: { context, selection, expectedRevision }
    }),
    persist: async (context, selection, expectedRevision) => await request({
      version: 1,
      sessionId: boot.sessionId,
      requestId: context.requestId,
      operation: "persist",
      payload: { context, selection, expectedRevision }
    }),
    reconcile: async (context, lastPublished) => await request({
      version: 1,
      sessionId: boot.sessionId,
      requestId: context.requestId,
      operation: "reconcile",
      payload: { context, lastPublished }
    }),
    ready: async (bootRevision, rootRevision) => {
      if (bootRevision !== boot.bootRevision || rootRevision !== boot.snapshot.revision)
        throw Error("STALE_PRESENTATION_READY");
      await request({
        version: 1,
        sessionId: boot.sessionId,
        requestId: id(),
        operation: "ready",
        payload: { bootRevision, rootRevision }
      });
    }
  });
}
const success = (value) => ({ ok: true, value });
const failure = (code, issues = [], operationId) => ({
  ok: false,
  error: {
    code,
    message: code,
    retriable: ["REPOSITORY_UNAVAILABLE", "INDEX_OUT_OF_SYNC"].includes(code),
    issues,
    ...{}
  }
});
const LIMITS = Object.freeze({
  depth: 64,
  values: 1e5,
  page: 1e3,
  batch: 1e3,
  operations: 1024,
  traversalDepth: 32,
  traversalResults: 1e4
});
const unsafe = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonblank = (value) => typeof value === "string" && !!value.trim();
const typeId = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*:[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
function fields(value, required, optional = []) {
  return record(value) && required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}
function copyJson(input) {
  let count = 0;
  const active = /* @__PURE__ */ new Set();
  const visit = (value, depth) => {
    if (++count > LIMITS.values || depth > LIMITS.depth) throw "RESOURCE_LIMIT";
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value === null || typeof value !== "object") throw "INVALID_INPUT";
    if (active.has(value)) throw "INVALID_INPUT";
    const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
    if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null)
      throw "INVALID_INPUT";
    const keys2 = Reflect.ownKeys(value);
    if (keys2.some((key) => typeof key === "symbol")) throw "INVALID_INPUT";
    if (keys2.length > LIMITS.values + 1) throw "RESOURCE_LIMIT";
    const descriptors = Object.getOwnPropertyDescriptors(value);
    active.add(value);
    let output;
    if (array) {
      if (value.length > LIMITS.values) throw "RESOURCE_LIMIT";
      if (keys2.length !== value.length + 1) throw "INVALID_INPUT";
      const values = [];
      for (let i = 0; i < value.length; i++) {
        const d = descriptors[String(i)];
        if (!d || !("value" in d) || !d.enumerable) throw "INVALID_INPUT";
        values.push(visit(d.value, depth + 1));
      }
      output = values;
    } else {
      const values = {};
      for (const [key, d] of Object.entries(descriptors)) {
        if (unsafe.has(key) || !("value" in d) || !d.enumerable) throw "INVALID_INPUT";
        values[key] = visit(d.value, depth + 1);
      }
      output = values;
    }
    active.delete(value);
    return output;
  };
  try {
    return success(visit(input, 0));
  } catch (error) {
    return failure(error === "RESOURCE_LIMIT" ? "RESOURCE_LIMIT" : "INVALID_INPUT");
  }
}
function isReference(value, kind = "object") {
  const id = kind === "object" ? "objectId" : "relationId";
  return fields(value, ["repositoryId", id]) && nonblank(value.repositoryId) && nonblank(value[id]);
}
function entityShape(value, kind) {
  const relation = kind === "relation";
  return fields(
    value,
    relation ? ["ref", "typeId", "source", "target", "attributes", "revision"] : ["ref", "typeId", "name", "attributes", "revision"]
  ) && isReference(value.ref, kind) && typeId(value.typeId) && record(value.attributes) && nonblank(value.revision) && (relation ? isReference(value.source) && isReference(value.target) : nonblank(value.name));
}
function decodeObject(input) {
  const safe = copyJson(input);
  if (!safe.ok) return safe;
  return entityShape(safe.value, "object") ? success(safe.value) : failure("INVALID_INPUT");
}
function decodeRelation(input) {
  const safe = copyJson(input);
  if (!safe.ok) return safe;
  return entityShape(safe.value, "relation") ? success(safe.value) : failure("INVALID_INPUT");
}
const REPOSITORY_CHANNEL = "frade:repository";
const REPOSITORY_OPEN_CHANNEL = "frade:repository-open";
function decodeRequest(input) {
  const safe = copyJson(input);
  if (!safe.ok) return safe;
  const v = safe.value;
  if (!fields(v, ["version", "operation", "payload"]) || v.version !== 1)
    return failure("INVALID_INPUT");
  const keys2 = {
    getObject: ["ref"],
    getRelation: ["ref"],
    queryObjects: ["query"],
    queryRelations: ["query"],
    applyChanges: ["changeSet"],
    validate: ["changeSet"],
    getSubgraph: ["ref", "options"],
    reload: [],
    capabilities: [],
    reconcile: ["operationId"],
    presentation: [],
    diagram: [],
    integrationFlows: ["query"]
  };
  if (typeof v.operation !== "string" || !Object.hasOwn(keys2, v.operation) || !record(v.payload) || !(v.operation === "diagram" ? fields(v.payload, ["action"], ["path", "xml", "revision", "destination"]) : fields(v.payload, keys2[v.operation])))
    return failure("INVALID_INPUT");
  if ((v.operation === "getObject" || v.operation === "getRelation" || v.operation === "getSubgraph") && !isReference(v.payload.ref, v.operation === "getRelation" ? "relation" : "object"))
    return failure("MALFORMED_REFERENCE");
  if (v.operation === "applyChanges" && (!record(v.payload.changeSet) || !nonblank(v.payload.changeSet.idempotencyKey)))
    return failure("INVALID_INPUT");
  if (v.operation === "reconcile" && !nonblank(v.payload.operationId))
    return failure("INVALID_INPUT");
  if (v.operation === "getSubgraph" && !fields(v.payload.options, [], ["direction", "maxDepth", "maxResults"]))
    return failure("INVALID_INPUT");
  if (v.operation === "diagram") {
    const p = v.payload;
    if (!["list", "read", "create", "folder", "write", "rename", "catalogs"].includes(
      String(p.action)
    ) || Object.entries(p).some(([, value]) => typeof value !== "string") || !["list", "catalogs"].includes(String(p.action)) && !nonblank(p.path) || p.action === "write" && (!nonblank(p.xml) || !nonblank(p.revision)) || p.action === "rename" && (!nonblank(p.destination) || !nonblank(p.revision)))
      return failure("INVALID_INPUT");
  }
  return success(v);
}
const WORKBENCH_CHANNEL = "frade:workbench";
const WORKBENCH_EVENT_CHANNEL = "frade:workbench-event";
function decodeScope(input) {
  if (!fields(input, ["repositoryId", "sessionId", "generation", "modelGeneration"]) || !nonblank(input.repositoryId) || !nonblank(input.sessionId) || ![input.generation, input.modelGeneration].every(
    (v) => Number.isSafeInteger(v) && v > 0
  ))
    return failure("INVALID_INPUT");
  return success(input);
}
function decodeScopedRequest(input) {
  const safe = copyJson(input);
  if (!safe.ok) return safe;
  if (!fields(safe.value, ["scope", "request"])) return failure("INVALID_INPUT");
  const scope = decodeScope(safe.value.scope), request = decodeRequest(safe.value.request);
  if (!scope.ok) return scope;
  if (!request.ok) return request;
  return success({ scope: scope.value, request: request.value });
}
function decodeMetadataSet(input) {
  if (!fields(input, ["id", "label", "folderPath", "dialect", "schemaEntries", "documentEntries"]) || !["id", "label", "folderPath", "dialect"].every((k) => nonblank(input[k])) || !["schemaEntries", "documentEntries"].every(
    (k) => Array.isArray(input[k]) && input[k].length <= 100 && input[k].every(nonblank)
  ) || !input.schemaEntries.length)
    return failure("INVALID_INPUT");
  return success(input);
}
function decodeWorkspace(input) {
  const safe = copyJson(input);
  if (!safe.ok) return safe;
  const value = safe.value;
  if (!fields(value, ["version", "roots"]) || value.version !== 1 || !Array.isArray(value.roots) || value.roots.length > 64)
    return failure("INVALID_INPUT");
  const ids = /* @__PURE__ */ new Set();
  for (const root of value.roots) {
    if (!fields(
      root,
      [
        "repositoryId",
        "label",
        "adapterKind",
        "dataRoot",
        "entry",
        "metadataSets",
        "activeMetadataSet"
      ],
      ["readOnly", "externalCatalogs"]
    ) || !["repositoryId", "label", "adapterKind", "dataRoot", "entry"].every(
      (k) => nonblank(root[k])
    ) || typeof root.activeMetadataSet !== "string" || root.readOnly !== void 0 && typeof root.readOnly !== "boolean" || !Array.isArray(root.metadataSets) || root.metadataSets.length > 32)
      return failure("INVALID_INPUT");
    if (root.externalCatalogs !== void 0 && (!Array.isArray(root.externalCatalogs) || root.externalCatalogs.length > 32 || root.externalCatalogs.some(
      (c) => !fields(c, ["id", "path"]) || !nonblank(c.id) || !nonblank(c.path)
    )))
      return failure("INVALID_INPUT");
    if (ids.has(root.repositoryId)) return failure("INVALID_INPUT");
    ids.add(root.repositoryId);
    const sets = /* @__PURE__ */ new Set();
    for (const set of root.metadataSets) {
      const decoded = decodeMetadataSet(set);
      if (!decoded.ok) return decoded;
      if (sets.has(decoded.value.id)) return failure("INVALID_INPUT");
      sets.add(decoded.value.id);
    }
    if (root.adapterKind === "sberea" && !sets.has(root.activeMetadataSet))
      return failure("INVALID_INPUT");
  }
  return success(value);
}
function decodeHostCommand(input) {
  const safe = copyJson(input);
  if (!safe.ok) return safe;
  const v = safe.value;
  if (!record(v) || !nonblank(v.operation)) return failure("INVALID_INPUT");
  const shape = {
    connectCatalog: ["repositoryId"],
    disconnectCatalog: ["repositoryId", "sourceId"],
    add: ["adapterKind"],
    remove: ["repositoryId"],
    openWorkspace: [],
    saveWorkspace: ["roots"],
    restore: [],
    retry: ["repositoryId"],
    reorder: ["repositoryIds"],
    rename: ["repositoryId", "label"],
    approveClose: [],
    cancelMetadata: ["repositoryId"],
    removeMetadataSet: ["repositoryId", "metadataSetId"],
    browseMetadata: ["repositoryId"],
    stageMetadata: ["repositoryId", "metadataSet"],
    activateMetadata: ["repositoryId", "candidateId"],
    recoveryPreview: ["repositoryId"],
    recoveryResolve: ["repositoryId", "journalHash", "sourceHash"],
    window: ["action"]
  };
  if (!Object.hasOwn(shape, v.operation) || !fields(v, ["operation", ...shape[v.operation]]))
    return failure("INVALID_INPUT");
  if (shape[v.operation].some(
    (k) => !["roots", "metadataSet", "repositoryIds"].includes(k) && !nonblank(v[k])
  ))
    return failure("INVALID_INPUT");
  if (v.operation === "reorder" && (!Array.isArray(v.repositoryIds) || !v.repositoryIds.every(nonblank) || new Set(v.repositoryIds).size !== v.repositoryIds.length))
    return failure("INVALID_INPUT");
  if (v.operation === "saveWorkspace" && !decodeWorkspace({ version: 1, roots: v.roots }).ok)
    return failure("INVALID_INPUT");
  if (v.operation === "stageMetadata" && !decodeMetadataSet(v.metadataSet).ok)
    return failure("INVALID_INPUT");
  if (v.operation === "window" && !["minimize", "maximize", "close"].includes(String(v.action)))
    return failure("INVALID_INPUT");
  return success(v);
}
const WORKBENCH_REQUEST_CHANNEL = "frade:workbench-request";
const WORKBENCH_CLOSE_CHANNEL = "frade:workbench-close-request";
function boundedWorkbenchValue(input) {
  const safe = copyJson(input);
  if (!safe.ok) return safe;
  if (JSON.stringify(safe.value).length > 8e6) return failure("RESOURCE_LIMIT");
  return safe;
}
function decodeWorkbenchResult(input) {
  const safe = boundedWorkbenchValue(input);
  if (!safe.ok) return safe;
  const v = safe.value;
  if (!record(v) || typeof v.ok !== "boolean") return failure("ADAPTER_CONTRACT");
  if (v.ok) return fields(v, ["ok", "value"]) ? success(v.value) : failure("ADAPTER_CONTRACT");
  if (!fields(v, ["ok", "error"]) || !fields(v.error, ["code", "message", "retriable", "issues"], ["operationId"]) || !nonblank(v.error.code) || typeof v.error.message !== "string" || typeof v.error.retriable !== "boolean" || !validIssues(v.error.issues) || v.error.operationId !== void 0 && !nonblank(v.error.operationId))
    return failure("ADAPTER_CONTRACT");
  return v;
}
function decodeWorkbenchEvent(input) {
  const safe = boundedWorkbenchValue(input);
  if (!safe.ok) return safe;
  if (!fields(safe.value, ["version", "scope", "event"]) || safe.value.version !== 1)
    return failure("INVALID_INPUT");
  const scope = decodeScope(safe.value.scope), event = safe.value.event;
  if (!scope.ok) return scope;
  if (!fields(event, ["eventId", "repositoryId", "sequence", "type", "revision"], ["ref", "state"]) || event.state !== void 0 && !["READY", "READ_ONLY", "DEGRADED"].includes(String(event.state)) || event.ref !== void 0 && (!record(event.ref) || event.ref.repositoryId !== scope.value.repositoryId || !isReference(
    event.ref,
    String(event.type).startsWith("relation.") ? "relation" : "object"
  )) || event.repositoryId !== scope.value.repositoryId || !nonblank(event.eventId) || !Number.isSafeInteger(event.sequence) || event.sequence < 1 || !nonblank(event.revision) || ![
    "object.created",
    "object.updated",
    "object.deleted",
    "relation.created",
    "relation.updated",
    "relation.deleted",
    "metamodel.changed",
    "repository.reloaded"
  ].includes(String(event.type)))
    return failure("INVALID_INPUT");
  return success(safe.value);
}
function validIssues(value) {
  return Array.isArray(value) && value.every(
    (i) => fields(i, ["code", "message", "path"], ["ref", "details"]) && typeof i.code === "string" && typeof i.message === "string" && Array.isArray(i.path) && i.path.every((p) => typeof p === "string" || Number.isSafeInteger(p))
  );
}
function decodeOperationResult(input, request) {
  const result = decodeWorkbenchResult(input);
  if (!result.ok) return result;
  const v = result.value, invalid2 = () => failure("ADAPTER_CONTRACT");
  if (request.operation === "diagram") {
    if (!record(v)) return invalid2();
    if (request.payload.action === "catalogs") {
      if (!Array.isArray(v.catalogs) || v.catalogs.length > 32 || !Array.isArray(v.errors) || !v.errors.every((e) => typeof e === "string") || v.catalogs.some(
        (c) => !fields(c, ["version", "id", "label", "objects"]) || c.version !== 1 || !nonblank(c.id) || typeof c.label !== "string" || !Array.isArray(c.objects) || c.objects.length > 5e3 || c.objects.some(
          (o) => !fields(o, ["id", "name"], ["type", "attributes"]) || !nonblank(o.id) || typeof o.name !== "string" || o.type !== void 0 && typeof o.type !== "string" || o.attributes !== void 0 && (!record(o.attributes) || !copyJson(o.attributes).ok)
        )
      ))
        return invalid2();
      return result;
    }
    if (request.payload.action === "list") {
      if (!Array.isArray(v.entries) || v.entries.length > 2e3 || v.entries.some(
        (e) => !fields(e, ["path", "kind"]) || !nonblank(e.path) || !["file", "folder"].includes(String(e.kind))
      ))
        return invalid2();
    } else if (!nonblank(v.path) || ["read", "create", "write"].includes(String(request.payload.action)) && (typeof v.xml !== "string" || !nonblank(v.revision)))
      return invalid2();
  }
  if (request.operation === "getObject") return decodeObject(v).ok ? result : invalid2();
  if (request.operation === "getRelation") return decodeRelation(v).ok ? result : invalid2();
  if (request.operation === "queryObjects" || request.operation === "queryRelations") {
    if (!record(v) || !Array.isArray(v.items) || v.items.length > 1e3 || !nonblank(v.revision) || v.cursor !== void 0 && !nonblank(v.cursor))
      return invalid2();
    const decode = request.operation === "queryObjects" ? decodeObject : decodeRelation;
    if (v.items.some((item) => !decode(item).ok)) return invalid2();
  }
  if (request.operation === "validate" && (!record(v) || !validIssues(v.errors) || !validIssues(v.warnings)))
    return invalid2();
  if (request.operation === "presentation") {
    if (!fields(v, ["types", "sources", "diagnostics", "sections", "revision"]) || !nonblank(v.revision) || !Array.isArray(v.types) || !Array.isArray(v.sources) || !Array.isArray(v.sections) || !validIssues(v.diagnostics))
      return invalid2();
    if (v.types.some(
      (t) => !record(t) || !["id", "externalId", "label", "section", "description"].every(
        (k) => typeof t[k] === "string"
      ) || !record(t.rule) || !Array.isArray(t.fields) || !Array.isArray(t.nameFields) || !t.nameFields.every(nonblank)
    ))
      return invalid2();
    if (v.sources.some(
      (s) => !fields(s, ["objectId", "entry", "writable"]) || !nonblank(s.objectId) || !nonblank(s.entry) || typeof s.writable !== "boolean"
    ))
      return invalid2();
  }
  return result;
}
electron.contextBridge.exposeInMainWorld(
  "fradePresentation",
  createPresentationApi(
    electron.ipcRenderer.sendSync(PRESENTATION_BOOT_CHANNEL),
    (value) => electron.ipcRenderer.invoke(PRESENTATION_CHANNEL, value),
    () => crypto.randomUUID()
  )
);
const api = createDesktopApi(
  (value) => electron.ipcRenderer.invoke(REQUEST_CHANNEL, value),
  (listener) => {
    const handler = (_event, value) => listener(value);
    electron.ipcRenderer.on(EVENT_CHANNEL, handler);
    return () => {
      electron.ipcRenderer.removeListener(EVENT_CHANNEL, handler);
    };
  },
  () => crypto.randomUUID()
);
electron.contextBridge.exposeInMainWorld("frade", api);
const safeResponse = (value) => {
  const copied = copyJson(value);
  return copied.ok ? copied.value : failure("ADAPTER_CONTRACT");
};
electron.contextBridge.exposeInMainWorld("fradeRepository", {
  open: async () => safeResponse(await electron.ipcRenderer.invoke(REPOSITORY_OPEN_CHANNEL)),
  request: async (value) => {
    const decoded = decodeRequest(value);
    return decoded.ok ? safeResponse(await electron.ipcRenderer.invoke(REPOSITORY_CHANNEL, decoded.value)) : decoded;
  }
});
electron.contextBridge.exposeInMainWorld("fradeWorkbench", {
  command: async (input) => {
    const decoded = decodeHostCommand(input);
    return decoded.ok ? decodeWorkbenchResult(await electron.ipcRenderer.invoke(WORKBENCH_CHANNEL, decoded.value)) : decoded;
  },
  request: async (input) => {
    const decoded = decodeScopedRequest(input);
    return decoded.ok ? decodeOperationResult(
      await electron.ipcRenderer.invoke(WORKBENCH_REQUEST_CHANNEL, decoded.value),
      decoded.value.request
    ) : decoded;
  },
  subscribe: (listener) => {
    let active = true;
    const handler = (_e, input) => {
      const decoded = decodeWorkbenchEvent(input);
      if (active && decoded.ok) listener(decoded.value);
    };
    electron.ipcRenderer.on(WORKBENCH_EVENT_CHANNEL, handler);
    return () => {
      active = false;
      electron.ipcRenderer.off(WORKBENCH_EVENT_CHANNEL, handler);
    };
  },
  onCloseRequested: (listener) => {
    const handler = () => listener();
    electron.ipcRenderer.on(WORKBENCH_CLOSE_CHANNEL, handler);
    return () => electron.ipcRenderer.off(WORKBENCH_CLOSE_CHANNEL, handler);
  }
});
