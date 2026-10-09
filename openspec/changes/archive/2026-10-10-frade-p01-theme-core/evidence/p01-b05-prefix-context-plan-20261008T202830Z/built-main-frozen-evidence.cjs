"use strict";
const promises = require("node:fs/promises");
const node_path = require("node:path");
const electron = require("electron");
const node_crypto = require("node:crypto");
const node_url = require("node:url");
function drawioRepositoryBridge(parentOrigin) {
  const globals = window;
  let graph, hooked = false, enabled = false;
  let appearances = /* @__PURE__ */ new Map(), staged = /* @__PURE__ */ new Map(), live = false;
  let emptyBundle = { stroke: "#404040", width: 1 };
  let applied = /* @__PURE__ */ new WeakMap();
  const identity2 = (id, sourceId) => JSON.stringify([id, sourceId ?? ""]);
  const validStyle = (input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) return false;
    const entries = Object.entries(input);
    return entries.length === 11 && entries.every(([key, value]) => {
      if (typeof value !== "string") return false;
      if (["fillColor", "strokeColor", "shadowColor"].includes(key))
        return /^#[0-9a-f]{6}$/i.test(value);
      if (key === "shape") return value === "rectangle";
      if (key === "rounded") return value === "0";
      if (key === "shadow") return value === "0" || value === "1";
      const number = Number(value);
      if (!value.trim() || !Number.isFinite(number)) return false;
      if (key === "strokeWidth") return number >= 0.1 && number <= 20;
      if (key === "shadowOpacity" || key === "shadowBlur") return number >= 0 && number <= 100;
      return ["shadowOffsetX", "shadowOffsetY"].includes(key) && Math.abs(number) <= 100;
    });
  };
  const isSystem = (cell) => !!cell?.value?.getAttribute && appearances.has(
    identity2(
      cell.value.getAttribute("fradeObjectId") ?? "",
      cell.value.getAttribute("fradeSourceId") ?? void 0
    )
  );
  const applyBundle = (cell) => {
    if (!graph) return;
    const style = {
      strokeColor: emptyBundle.stroke,
      strokeWidth: String(emptyBundle.width),
      startArrow: "none",
      endArrow: "none",
      dashed: "0"
    };
    const signature = JSON.stringify(style);
    if (applied.get(cell) === signature) return;
    applied.set(cell, signature);
    const current = graph.getCellStyle(cell);
    for (const [key, value] of Object.entries(style))
      if (String(current[key]) !== value) graph.setCellStyles(key, value, [cell]);
  };
  const refresh = () => {
    if (!graph || !live || !enabled || !graph.isEnabled()) return;
    const model = graph.getModel();
    model.beginUpdate();
    try {
      for (const cell of model.getDescendants(model.getRoot())) {
        const value = cell.value;
        if (cell.edge && value?.getAttribute?.("fradeBundle") === "empty" && !graph.isCellLocked(cell)) {
          applyBundle(cell);
          continue;
        }
        if (!cell.vertex || !value?.getAttribute || graph.isCellLocked(cell)) continue;
        const item = appearances.get(
          identity2(
            value.getAttribute("fradeObjectId") ?? "",
            value.getAttribute("fradeSourceId") ?? void 0
          )
        );
        if (!item) continue;
        const signature = JSON.stringify(item.style);
        if (applied.get(cell) === signature) continue;
        applied.set(cell, signature);
        const current = graph.getCellStyle(cell);
        for (const [key, val] of Object.entries(item.style))
          if (String(current[key]) !== val) graph.setCellStyles(key, val, [cell]);
      }
    } finally {
      model.endUpdate();
    }
  };
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== parentOrigin || typeof event.data !== "string" || event.data.length > 65536)
      return;
    let data2;
    try {
      data2 = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!data2 || typeof data2 !== "object") return;
    if ([
      "fradeDropState",
      "fradeAppearanceBegin",
      "fradeAppearanceChunk",
      "fradeAppearanceCommit",
      "fradeRepositoryInsert"
    ].includes(data2.action))
      event.stopImmediatePropagation();
    if (data2.action === "configure" && !hooked && globals.EditorUi) {
      hooked = true;
      const prototype = globals.EditorUi.prototype, original = prototype.init;
      prototype.init = function(...args) {
        const result = original.apply(this, args);
        graph = this.editor.graph;
        this.editor.addListener("pageSelected", refresh);
        graph.connectionHandler?.addListener("connect", (_sender, event2) => {
          const cell = event2.getProperty("cell");
          if (!graph || !enabled || !graph.isEnabled() || !cell) return;
          const model = graph.getModel();
          if (!isSystem(model.getTerminal(cell, true)) || !isSystem(model.getTerminal(cell, false)))
            return;
          const value = cell.value?.getAttribute ? cell.value.cloneNode(true) : document.implementation.createDocument("", "", null).createElement("UserObject");
          if (!cell.value?.getAttribute) value.setAttribute("label", String(cell.value ?? ""));
          value.setAttribute("fradeBundle", "empty");
          model.setValue(cell, value);
          applyBundle(cell);
        });
        return result;
      };
    } else if (data2.action === "fradeDropState") {
      enabled = data2.enabled === true;
    } else if (data2.action === "fradeAppearanceBegin") {
      const bundle = data2.emptyBundle;
      if (bundle && /^#[0-9a-f]{6}$/i.test(bundle.stroke) && typeof bundle.width === "number" && Number.isFinite(bundle.width) && bundle.width >= 0.1 && bundle.width <= 20)
        emptyBundle = { stroke: bundle.stroke, width: bundle.width };
      if (data2.live === true && !live) applied = /* @__PURE__ */ new WeakMap();
      live = data2.live === true;
      staged = /* @__PURE__ */ new Map();
    } else if (data2.action === "fradeAppearanceChunk" && Array.isArray(data2.objects) && data2.objects.length <= 50) {
      for (const object of data2.objects) {
        if (staged.size >= 1e5) break;
        if (object && typeof object.id === "string" && object.id.length <= 1e3 && (object.sourceId === void 0 || typeof object.sourceId === "string") && validStyle(object.style))
          staged.set(identity2(object.id, object.sourceId), object);
      }
    } else if (data2.action === "fradeAppearanceCommit") {
      appearances = staged;
      refresh();
    } else if (data2.action === "fradeRepositoryInsert" && graph) {
      const object = data2.object, clientX = data2.clientX, clientY = data2.clientY;
      if (!enabled || !graph.isEnabled() || !Number.isFinite(clientX) || !Number.isFinite(clientY))
        return;
      const rect = graph.container.getBoundingClientRect();
      if (clientX < rect.left || clientX >= rect.right || clientY < rect.top || clientY >= rect.bottom)
        return;
      const parent = graph.getDefaultParent();
      if (graph.isCellLocked(parent)) return;
      if (!object || typeof object.id !== "string" || typeof object.name !== "string" || object.sourceId !== void 0 && typeof object.sourceId !== "string")
        return;
      const point = graph.getPointForEvent({ clientX, clientY }, false);
      const doc = document.implementation.createDocument("", "", null);
      const value = doc.createElement("UserObject");
      value.setAttribute("label", object.name);
      value.setAttribute("fradeObjectId", object.id);
      if (object.sourceId) value.setAttribute("fradeSourceId", object.sourceId);
      const model = graph.getModel();
      model.beginUpdate();
      try {
        const cell = graph.insertVertex(
          parent,
          null,
          value,
          point.x,
          point.y,
          180,
          70,
          validStyle(data2.style) ? "whiteSpace=wrap;html=0;" + Object.entries(data2.style).map(([key, value2]) => key + "=" + value2 + ";").join("") : "rounded=1;whiteSpace=wrap;html=0;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        );
        if (validStyle(data2.style)) applied.set(cell, JSON.stringify(data2.style));
        graph.setSelectionCell(cell);
      } finally {
        model.endUpdate();
      }
    }
  });
}
function drawioFlowBridge(parentOrigin) {
  const globals = window;
  let graph, hooked = false, repositoryId = "", active, sequence = 0;
  const badges = /* @__PURE__ */ new Map(), pending = /* @__PURE__ */ new Map();
  let panelMode;
  let pressed = false, pointerId = 1;
  const releasePointer = (x = 0, y = 0) => {
    if (!pressed) return;
    pressed = false;
    document.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        pointerId,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX: x,
        clientY: y
      })
    );
    document.dispatchEvent(
      new MouseEvent("mouseup", { bubbles: true, clientX: x, clientY: y, buttons: 0 })
    );
    graph?.escape?.();
    if (graph) graph.isMouseDown = false;
  };
  document.addEventListener(
    "pointerdown",
    (event) => {
      pointerId = event.pointerId;
      pressed = true;
    },
    true
  );
  document.addEventListener(
    "pointerup",
    () => {
      pressed = false;
    },
    true
  );
  document.addEventListener("pointercancel", () => releasePointer(), true);
  document.addEventListener(
    "pointermove",
    (event) => {
      if (pressed && event.buttons === 0) releasePointer(event.clientX, event.clientY);
    },
    true
  );
  window.addEventListener("blur", () => releasePointer());
  const post = (data2) => window.parent.postMessage(JSON.stringify(data2), parentOrigin);
  const ref = (cell) => {
    const value = cell?.value;
    const id = value?.getAttribute?.("fradeObjectId");
    return id && !value.getAttribute("fradeSourceId") ? { repositoryId, objectId: id } : void 0;
  };
  const validRefs = (refs) => Array.isArray(refs) && refs.length <= 1e5 && refs.every(
    (r) => r && typeof r.repositoryId === "string" && r.repositoryId.length > 0 && typeof r.objectId === "string" && r.objectId.length > 0 && Object.keys(r).length === 2
  ) && new Set(refs.map((r) => JSON.stringify([r.repositoryId, r.objectId]))).size === refs.length;
  const members = (cell) => {
    try {
      const data2 = JSON.parse(cell.value.getAttribute("fradeIntegrationFlowRefs") ?? "[]");
      return validRefs(data2) ? data2 : [];
    } catch {
      return [];
    }
  };
  const state = (cell, a, b) => ({
    id: cell.id,
    endpointA: ref(a ?? graph.getModel().getTerminal(cell, true)),
    endpointB: ref(b ?? graph.getModel().getTerminal(cell, false)),
    members: members(cell),
    invalidMembership: (() => {
      try {
        return !validRefs(JSON.parse(cell.value.getAttribute("fradeIntegrationFlowRefs") ?? "[]"));
      } catch {
        return true;
      }
    })()
  });
  const isBundle = (cell) => !!cell?.edge && cell.value?.getAttribute?.("fradeBundle") === "empty";
  const sendState = (cell, event = "selected") => {
    if (!isBundle(cell)) return;
    active = cell;
    post({ event: "fradeFlow", kind: event, bundle: state(cell) });
  };
  const setMembers = (cell, refs) => {
    if (!validRefs(refs)) throw Error("Invalid members");
    const value = cell.value.cloneNode(true);
    value.setAttribute("fradeIntegrationFlowRefs", JSON.stringify(refs));
    graph.getModel().setValue(cell, value);
  };
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== parentOrigin || typeof event.data !== "string" || event.data.length > 6 * 1024 * 1024)
      return;
    let data2;
    try {
      data2 = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!data2 || typeof data2 !== "object") return;
    if (data2.action === "configure" && !hooked && globals.EditorUi) {
      hooked = true;
      const prototype = globals.EditorUi.prototype, original = prototype.init;
      prototype.init = function(...args) {
        const result = original.apply(this, args);
        graph = this.editor.graph;
        const model = graph.getModel();
        let savedPanels;
        panelMode = (open) => {
          if (open && !savedPanels) {
            savedPanels = { shapes: this.hsplitPosition, format: this.formatWidth };
            this.hsplitPosition = 0;
            this.formatWidth = 0;
            this.refresh(true);
            requestAnimationFrame(
              () => requestAnimationFrame(() => {
                if (savedPanels && active && model.getCell(active.id) === active)
                  graph.scrollCellToVisible(active, true);
              })
            );
          } else if (!open && savedPanels) {
            const saved = savedPanels;
            savedPanels = void 0;
            this.hsplitPosition = saved.shapes;
            this.formatWidth = saved.format;
            this.refresh(true);
            requestAnimationFrame(
              () => requestAnimationFrame(() => {
                if (!savedPanels && active && model.getCell(active.id) === active)
                  graph.scrollCellToVisible(active, true);
              })
            );
          }
        };
        const annotate = () => {
          for (const cell of model.getDescendants(model.getRoot()))
            if (isBundle(cell))
              post({ event: "fradeFlow", kind: "annotation", bundle: state(cell) });
        };
        graph.fradeAnnotateBundles = annotate;
        graph.getSelectionModel().addListener("change", () => sendState(graph.getSelectionCell()));
        model.addListener("change", () => {
          annotate();
          if (active && model.getCell(active.id) === active) sendState(active, "changed");
          else if (active) {
            post({ event: "fradeFlow", kind: "removed", id: active.id });
            active = void 0;
          }
        });
        const nativeDoubleClick = graph.dblClick;
        graph.dblClick = function(event2, cell) {
          let bundle = isBundle(cell) ? cell : void 0;
          if (!bundle) {
            const point = globals.mxUtils.convertPoint(
              graph.container,
              event2.clientX,
              event2.clientY
            );
            bundle = model.getDescendants(model.getRoot()).find((candidate) => {
              if (!isBundle(candidate)) return false;
              const points = graph.getView().getState(candidate)?.absolutePoints ?? [];
              return points.some(
                (p, i) => i > 0 && p && points[i - 1] && globals.mxUtils.ptSegDistSq(
                  points[i - 1].x,
                  points[i - 1].y,
                  p.x,
                  p.y,
                  point.x,
                  point.y
                ) <= 64
              );
            });
          }
          if (bundle) {
            globals.mxEvent.consume(event2);
            sendState(bundle, "open");
            return;
          }
          return nativeDoubleClick.call(this, event2, cell);
        };
        graph.addListener("doubleClick", (_sender, event2) => {
          const cell = event2.getProperty("cell");
          if (isBundle(cell)) {
            event2.consume();
            sendState(cell, "open");
          }
        });
        graph.addMouseListener({
          mouseDown: () => {
          },
          mouseUp: () => {
          },
          mouseMove: (_sender, event2) => {
            const cell = event2.getCell();
            if (isBundle(cell) && cell !== active) sendState(cell, "hover");
          }
        });
        graph.connectionHandler?.addListener("connect", (_sender, event2) => {
          const cell = event2.getProperty("cell");
          if (isBundle(cell)) sendState(cell, "created");
        });
        const popup = this.menus.createPopupMenu;
        this.menus.createPopupMenu = function(menu, ...args2) {
          popup.call(this, menu, ...args2);
          const cell = graph.getSelectionCell();
          if (isBundle(cell)) {
            menu.addSeparator();
            menu.addItem("Интеграционные потоки…", null, () => sendState(cell, "open"));
          }
        };
        const text2 = graph.convertValueToString;
        graph.convertValueToString = function(cell) {
          const label = text2.call(this, cell);
          if (!isBundle(cell)) return label;
          return badges.get(cell.id) ?? "";
        };
        const cellStyle = graph.getCellStyle;
        graph.getCellStyle = function(cell, ...args2) {
          const style = cellStyle.call(this, cell, ...args2);
          return isBundle(cell) ? { ...style, align: "left", labelBackgroundColor: "#FFFFFFAA" } : style;
        };
        const measure = document.createElement("canvas").getContext("2d");
        const view = graph.getView(), edgeLabelOffset = view.updateEdgeLabelOffset;
        view.updateEdgeLabelOffset = function(state2) {
          edgeLabelOffset.call(this, state2);
          const geometry = model.getGeometry(state2.cell);
          if (isBundle(state2.cell) && !geometry?.x && !geometry?.y && !geometry?.offset) {
            const lines = (badges.get(state2.cell.id) ?? "").split("\n");
            if (measure)
              measure.font = (state2.style.fontSize ?? 11) + "px " + (state2.style.fontFamily ?? "Arial");
            const width = Math.max(
              0,
              ...lines.map((line) => measure?.measureText(line).width ?? line.length * 7)
            );
            state2.absoluteOffset.x -= width / 2;
            state2.absoluteOffset.y -= 48 + (lines.length - 1) * 8;
          }
        };
        const isHtmlLabel = graph.isHtmlLabel;
        graph.isHtmlLabel = function(cell) {
          return isBundle(cell) ? false : isHtmlLabel.call(this, cell);
        };
        const connect = graph.connectCell;
        graph.connectCell = function(cell, terminal, source, ...args2) {
          if (!isBundle(cell) || members(cell).length === 0)
            return connect.call(this, cell, terminal, source, ...args2);
          const oldA = model.getTerminal(cell, true), oldB = model.getTerminal(cell, false);
          if ((source ? oldA : oldB) === terminal)
            return connect.call(this, cell, terminal, source, ...args2);
          const token = ++sequence;
          pending.set(token, {
            cell,
            terminal,
            source,
            args: args2,
            oldA,
            oldB,
            oldMembers: JSON.stringify(members(cell))
          });
          post({
            event: "fradeFlow",
            kind: "reconnect",
            token,
            bundle: state(cell, source ? terminal : oldA, source ? oldB : terminal)
          });
          graph.refresh();
          return cell;
        };
        graph.fradeCompleteReconnect = (token, refs, commit) => {
          const operation = pending.get(token);
          pending.delete(token);
          if (!operation) return;
          const { cell, terminal, source, args: args2, oldA, oldB } = operation;
          if (!commit || !graph.isEnabled() || graph.isCellLocked(cell) || model.getCell(cell.id) !== cell || model.getTerminal(cell, true) !== oldA || model.getTerminal(cell, false) !== oldB || JSON.stringify(members(cell)) !== operation.oldMembers) {
            graph.refresh();
            return;
          }
          model.beginUpdate();
          try {
            connect.call(graph, cell, terminal, source, ...args2);
            setMembers(cell, refs);
          } finally {
            model.endUpdate();
          }
        };
        return result;
      };
    }
    if (data2.action !== "fradeFlow") return;
    event.stopImmediatePropagation();
    if (data2.kind === "init" && typeof data2.repositoryId === "string") {
      repositoryId = data2.repositoryId;
      graph?.fradeAnnotateBundles?.();
      return;
    }
    if (data2.kind === "releasePointer") {
      releasePointer(data2.x, data2.y);
      return;
    }
    if (!graph) return;
    if (data2.kind === "panel" && typeof data2.open === "boolean") {
      panelMode?.(data2.open);
      return;
    }
    if (data2.kind === "badge" && typeof data2.id === "string" && typeof data2.text === "string" && data2.text.length <= 1024 * 1024) {
      badges.set(data2.id, data2.text);
      const cell = graph.getModel().getCell(data2.id);
      if (cell) graph.refresh(cell);
      return;
    }
    if (data2.kind === "reconnect") {
      graph.fradeCompleteReconnect(data2.token, data2.members, data2.commit === true);
      return;
    }
    if (data2.kind === "membership") {
      try {
        const cell = graph.getModel().getCell(data2.id);
        if (!isBundle(cell) || !graph.isEnabled() || graph.isCellLocked(cell))
          throw Error("Bundle unavailable");
        const model = graph.getModel();
        model.beginUpdate();
        try {
          setMembers(cell, data2.members);
        } finally {
          model.endUpdate();
        }
        post({ event: "fradeFlow", kind: "ack", requestId: data2.requestId, ok: true });
      } catch {
        post({ event: "fradeFlow", kind: "ack", requestId: data2.requestId, ok: false });
      }
    }
  });
}
function drawioThemeBridge(parentOrigin) {
  if (parentOrigin !== "frade://app") {
    const url = new URL(parentOrigin);
    if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.origin !== parentOrigin)
      throw Error("Invalid presentation parent origin");
  }
  const roles2 = [
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
  const phaseKeys = [
    "version",
    "requestId",
    "sessionId",
    "generation",
    "transactionId",
    "revision",
    "membership",
    "phase"
  ];
  const globals = window, root = document.documentElement;
  let graph, ui, disposed = false, hooked = false, prototype, originalInit, installedInit;
  let owner, prepared, active, epoch = 0, patternSequence = 0, chordUntil = 0;
  let installedStyle, overlay, observer;
  const attributes = /* @__PURE__ */ new Map(), properties = /* @__PURE__ */ new Map(), masks = /* @__PURE__ */ new Map();
  const identity2 = (value) => typeof value === "string" && value.length > 0 && value.length <= 160 && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) && !value.split("/").some((part) => !part || part === "." || part === "..");
  const fields2 = (value, names) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === names.length && names.every((name) => Object.hasOwn(value, name));
  const integer2 = (value) => Number.isSafeInteger(value) && value >= 0;
  const sameOwner = (a, b) => a && b && phaseKeys.filter((key) => key !== "phase").every((key) => a[key] === b[key]);
  const validPhase = (value) => fields2(value, phaseKeys) && value.version === 1 && ["prepare", "apply", "rollback", "join"].includes(value.phase) && ["requestId", "sessionId", "transactionId"].every((key) => identity2(value[key])) && value.requestId === value.transactionId && ["generation", "revision", "membership"].every((key) => integer2(value[key]));
  const systemColor = (role) => [
    "action.primary",
    "action.primaryHover",
    "selection.bg",
    "selection.indicator",
    "focus.ring",
    "diagram.selection"
  ].includes(role) ? "Highlight" : ["action.onPrimary", "selection.fg"].includes(role) ? "HighlightText" : role.startsWith("surface.") || role.endsWith("Bg") || role === "diagram.canvas" ? "Canvas" : "CanvasText";
  function validSnapshot(value, context) {
    if (!fields2(value, [
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
    ]) || !identity2(value.id) || typeof value.label !== "string" || value.label.length < 1 || value.label.length > 160 || !["light", "dark", "high-contrast"].includes(value.kind) || !["compact", "comfortable"].includes(value.density) || value.revision !== context.revision || typeof value.forcedColors !== "boolean" || !["VALID", "REPAIRED", "FALLBACK"].includes(value.status) || !integer2(value.repairPasses) || value.repairPasses > 10 || !fields2(value.colors, roles2) || !fields2(value.effectiveColors, roles2))
      return false;
    if (roles2.some(
      (role) => typeof value.colors[role] !== "string" || !/^#[0-9a-f]{6}$/i.test(value.colors[role]) || value.effectiveColors[role] !== (value.forcedColors ? systemColor(role) : value.colors[role])
    ))
      return false;
    const text2 = (item, max = 512) => typeof item === "string" && item.length > 0 && item.length <= max && ![...item].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
    if (!Array.isArray(value.issues) || value.issues.length > 128 || value.issues.some(
      (item) => !fields2(item, [
        "code",
        "source",
        "message",
        ...Object.hasOwn(item ?? {}, "role") ? ["role"] : []
      ]) || !text2(item.code, 160) || !text2(item.source, 160) || !text2(item.message) || Object.hasOwn(item, "role") && !text2(item.role, 160)
    ))
      return false;
    if (!fields2(value.compatibility, ["recognized", "ignored", "repaired"])) return false;
    for (const key of ["recognized", "ignored", "repaired"]) {
      const items = value.compatibility[key];
      if (!Array.isArray(items) || items.length > 128 || new Set(items).size !== items.length || items.some(
        (item) => !text2(item, 160) || key !== "ignored" && !roles2.includes(item)
      ))
        return false;
    }
    return true;
  }
  const post = (data2) => window.parent.postMessage(JSON.stringify(data2), parentOrigin);
  const reply = (request, status, message) => post({
    event: "fradePresentation",
    version: 1,
    participantId: request.participantId,
    participantGeneration: request.participantGeneration,
    context: request.context,
    operation: request.operation,
    status,
    ...message ? { message: message.slice(0, 512) } : {}
  });
  const paint = () => new Promise(
    (resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  );
  const privateRoot = 'html[data-frade-frame-runtime="1"]';
  const upperSelector = privateRoot + " .geToolbarContainer .geToolbar a.geButton";
  const upperHashes = /* @__PURE__ */ new Set([
    "0a22cca4e14802d225bb7ef9dd30d4a42b157389a1681b84975349fd18a00b3a",
    "4dc5547840d699651cf7d3059a91d575cddaf80451ab85a7c41ed1d7c7998b24",
    "e78bd38fea8a799c13ffc0fbbab4d9ca6a1ee0ee57360c68596b58e4fe68da9a"
  ]);
  const upperVerified = /* @__PURE__ */ new Map(), upperOwners = /* @__PURE__ */ new Map();
  let upperPaintedRequest;
  const upperRootOwned = () => !!active && root.getAttribute("data-frade-frame-runtime") === "1" && root.getAttribute("data-frade-frame-revision") === String(active.snapshot.revision);
  const upperLive = (request, token) => !disposed && epoch === token && active?.request === request && currentPresentation() && upperRootOwned();
  const upperPropertyMatches = (node, name, saved) => node.style.getPropertyValue(name) === saved.projected && node.style.getPropertyPriority(name) === saved.projectedPriority;
  function restoreUpper(node, saved) {
    for (const [name, value] of saved.properties) {
      if (!upperPropertyMatches(node, name, value)) continue;
      if (value.before) node.style.setProperty(name, value.before, value.priority);
      else node.style.removeProperty(name);
    }
    if (node.getAttribute("data-frade-upper-glyph") === "1") {
      if (saved.marker === null) node.removeAttribute("data-frade-upper-glyph");
      else node.setAttribute("data-frade-upper-glyph", saved.marker);
    }
    if (!node.style.length) {
      if (saved.stylePresent) node.setAttribute("style", "");
      else node.removeAttribute("style");
    }
    upperOwners.delete(node);
  }
  function clearUpper() {
    clearUpperInteraction();
    upperPaintedRequest = void 0;
    for (const [node, saved] of upperOwners) restoreUpper(node, saved);
  }
  function upperSource(node) {
    if (!node.isConnected || !node.matches(upperSelector)) return;
    const owned2 = upperOwners.get(node), css = window.getComputedStyle(node);
    if (node.children.length || !["static", "relative"].includes(css.position) || !["18px", "18px auto", "18px 18px"].includes(css.backgroundSize) || !["50% 50%", "center center"].includes(css.backgroundPosition) || css.backgroundRepeat !== "no-repeat" || css.filter !== "none" || css.transform !== "none" || css.mixBlendMode !== "normal" || css.boxShadow !== "none" || css.clipPath !== "none") return;
    if (!owned2 && !["none", "normal"].includes(window.getComputedStyle(node, "::before").content)) return;
    if (!["none", "normal"].includes(window.getComputedStyle(node, "::after").content)) return;
    const box = node.getBoundingClientRect();
    if (box.width < 18 || box.height < 18) return;
    const image = owned2?.image ?? css.backgroundImage, match = image.match(/^url\(["']?(data:image\/svg\+xml[^)]*?)["']?\)$/i);
    if (!match || match[1].length > 24576) return;
    const url = match[1], comma = url.indexOf(","), header = url.slice(0, comma), encoded = url.slice(comma + 1);
    if (comma < 0 || !/^data:image\/svg\+xml(?:;charset=utf-8)?(?:;base64)?$/i.test(header)) return;
    let bytes;
    try {
      if (/;base64$/i.test(header)) bytes = atob(encoded);
      else bytes = Array.from(new TextEncoder().encode(decodeURIComponent(encoded)), (byte) => String.fromCharCode(byte)).join("");
    } catch {
      return;
    }
    if (!bytes.length || bytes.length > 4096) return;
    return { node, image, bytes };
  }
  function upperCandidates(strict) {
    for (const [node, saved] of upperOwners) {
      if (!node.isConnected || !node.matches(upperSelector) || node.className !== saved.className || node.getAttribute("data-frade-upper-glyph") !== "1" || Array.from(saved.properties).some(([name, value]) => !upperPropertyMatches(node, name, value))) restoreUpper(node, saved);
    }
    const nodes = document.querySelectorAll(upperSelector);
    if (nodes.length > 256) {
      if (strict) throw Error("Upper glyph candidate bound exceeded");
      return [];
    }
    return Array.from(nodes).map(upperSource).filter((source) => !!source);
  }
  function reconcileUpper(pendingRequest, pendingToken) {
    if (disposed || !upperRootOwned()) {
      clearUpper();
      return;
    }
    if (pendingRequest ? !upperLive(pendingRequest, pendingToken) : upperPaintedRequest !== active.request) return;
    const sources = upperCandidates(false), keep = /* @__PURE__ */ new Set();
    for (const source of sources) {
      if (!upperVerified.has(source.bytes)) continue;
      const { node } = source;
      keep.add(node);
      if (upperOwners.has(node)) continue;
      const saved = { ...source, marker: node.getAttribute("data-frade-upper-glyph"), stylePresent: node.hasAttribute("style"), className: node.className, properties: /* @__PURE__ */ new Map() };
      const project = (name, value) => {
        const before = node.style.getPropertyValue(name), priority = node.style.getPropertyPriority(name);
        node.style.setProperty(name, value, "important");
        saved.properties.set(name, { before, priority, projected: node.style.getPropertyValue(name), projectedPriority: node.style.getPropertyPriority(name) });
      };
      if (window.getComputedStyle(node).position === "static") project("position", "relative");
      project("--frade-upper-icon-image", source.image);
      project("background-image", "none");
      node.setAttribute("data-frade-upper-glyph", "1");
      upperOwners.set(node, saved);
    }
    for (const [node, saved] of upperOwners) if (!keep.has(node)) restoreUpper(node, saved);
    reconcileUpperInteraction();
  }
  function verifyUpper(request, token) {
    const deadline = performance.now() + 1800, examined = /* @__PURE__ */ new Set();
    let passes = 0, expired = false;
    const live = () => !expired && upperLive(request, token);
    const verify = () => {
      if (!live()) return;
      if (performance.now() >= deadline) throw Error("Upper glyph verification exceeded pending deadline");
      const sources = upperCandidates(true), unseen = /* @__PURE__ */ new Map();
      for (const source of sources) if (!upperVerified.has(source.bytes) && !examined.has(source.bytes)) {
        const siblings = unseen.get(source.bytes) ?? [];
        siblings.push(source);
        unseen.set(source.bytes, siblings);
      }
      if (!unseen.size) {
        reconcileUpper(request, token);
        return;
      }
      if (++passes > 3) throw Error("Upper glyph resources kept changing during verification");
      if (!window.crypto?.subtle?.digest) throw Error("Native upper glyph verification unavailable");
      return Promise.all(Array.from(unseen, async ([bytes, originals]) => {
        const digest = await window.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes, (byte) => byte.charCodeAt(0)));
        return { bytes, originals, hash: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("") };
      })).then((results) => {
        if (!live()) return;
        if (performance.now() >= deadline) throw Error("Upper glyph verification exceeded pending deadline");
        const current = upperCandidates(true);
        for (const result of results) {
          if (!result.originals.some((original) => current.some((source) => source.node === original.node && source.image === original.image && source.bytes === original.bytes))) continue;
          examined.add(result.bytes);
          if (upperHashes.has(result.hash)) upperVerified.set(result.bytes, result.hash);
        }
        return verify();
      });
    };
    const pending = verify();
    if (!pending) return;
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        reject(Error("Upper glyph verification exceeded pending deadline"));
      }, Math.max(0, deadline - performance.now()));
    });
    return Promise.race([pending, timeout]).catch((error) => {
      if (!upperLive(request, token)) return;
      throw error;
    }).finally(() => {
      if (timer !== void 0) clearTimeout(timer);
    });
  }
  function stylesheet(snapshot2) {
    const style = document.createElement("style");
    style.setAttribute("data-frade-private-theme", "1");
    const chrome = [
      ".geMenubarContainer",
      ".geToolbarContainer",
      ".geSidebarContainer",
      ".geFormatContainer",
      ".geFooterContainer",
      ".geDialog",
      ".mxPopupMenu"
    ], controls = chrome.flatMap(
      (selector) => ["button", "input", "select", "textarea", "a.geButton", "a.geItem", "a.geStatus"].map(
        (child) => privateRoot + " " + selector + " " + child
      )
    ), prefix = (selector) => privateRoot + " " + selector;
    style.textContent = chrome.map(prefix).join(",") + "{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border-color:var(--frade-frame-border-subtle)!important;color-scheme:" + (snapshot2.kind === "light" ? "light" : "dark") + ";}" + controls.join(",") + "{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border-color:var(--frade-frame-border-control)!important;min-height:" + (snapshot2.density === "compact" ? 28 : 36) + "px;min-width:24px;box-sizing:border-box;}" + controls.map((selector) => selector + ":hover").join(",") + "{background-color:var(--frade-frame-surface-hover)!important;}" + controls.map((selector) => selector + ":focus-visible").join(",") + "{outline:2px solid var(--frade-frame-focus-ring)!important;outline-offset:2px;}" + [prefix(".geMenubarContainer"), prefix(".geMenubar"), prefix(".geToolbarContainer")].join(
      ","
    ) + "{min-height:" + (snapshot2.density === "compact" ? 28 : 36) + "px;}" + prefix(".geDiagramContainer") + "{background-color:var(--frade-frame-diagram-canvas)!important;}" + prefix("[data-frade-presentation-grid-layer]") + "{background-image:none!important;}@media(pointer:coarse){" + controls.join(",") + "{min-height:44px;min-width:44px;}" + [prefix(".geMenubarContainer"), prefix(".geMenubar"), prefix(".geToolbarContainer")].join(
      ","
    ) + "{min-height:44px;}}";
    const lower = prefix(".geTabContainer"), menu = prefix("[data-frade-lower-menu]"), size = snapshot2.density === "compact" ? 28 : 36;
    style.textContent += lower + "{height:auto!important;min-height:" + (size + 8) + "px!important;display:flex;align-items:center;gap:4px;padding:4px;box-sizing:border-box;background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border-color:var(--frade-frame-border-subtle)!important;}" + lower + " .geTabScroller{flex:1;min-width:0;max-width:none!important;display:flex;align-items:center;height:auto!important;background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;padding:4px;box-sizing:border-box;}" + lower + " .geTab{flex-shrink:0;height:auto!important;display:inline-flex;align-items:center;background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border-color:var(--frade-frame-border-subtle)!important;filter:none!important;}" + lower + ' [role="button"]{min-height:' + size + "px!important;min-width:24px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;}" + lower + " .gePageTab>span{padding:0 8px;}" + lower + " .geButton{color:inherit!important;opacity:1!important;filter:none!important;}" + lower + ' .geButton::before{content:"";display:inline-block;width:16px;height:16px;flex-shrink:0;mask-image:var(--frade-lower-icon-image);mask-size:contain;mask-repeat:no-repeat;mask-position:center;background-color:currentColor;forced-color-adjust:none;}' + lower + " .gePageTab.geActivePage{background-color:var(--frade-frame-selection-bg)!important;color:var(--frade-frame-selection-fg)!important;border-color:var(--frade-frame-selection-indicator)!important;}" + lower + ' [role="button"]:hover{background-color:var(--frade-frame-surface-hover)!important;color:var(--frade-frame-text-primary)!important;}' + lower + ' [role="button"][aria-disabled="true"]{color:var(--frade-frame-text-disabled)!important;}' + menu + "{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border:1px solid var(--frade-frame-border-control)!important;padding:4px;box-sizing:border-box;}" + menu + " td{background-color:inherit!important;color:inherit!important;border-color:var(--frade-frame-border-subtle)!important;}" + menu + ' [role^="menuitem"]{height:' + size + "px;min-width:24px;background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;}" + menu + ' [role^="menuitem"]:hover,' + menu + " .mxPopupMenuItemHover{background-color:var(--frade-frame-surface-hover)!important;}" + menu + ' [aria-disabled="true"]{color:var(--frade-frame-text-disabled)!important;}' + lower + ' [role="button"]:focus-visible,' + menu + ' [role^="menuitem"]:focus-visible{outline:2px solid var(--frade-frame-focus-ring)!important;outline-offset:2px;}@media(forced-colors:active){' + lower + ' [role="button"]:focus-visible{box-shadow:0 0 0 4px var(--frade-frame-surface-panel)!important;}}@media(pointer:coarse){' + lower + ' [role="button"]{min-height:44px!important;min-width:44px!important;}' + menu + ' [role^="menuitem"]{height:44px!important;min-width:44px;}}';
    style.textContent += upperSelector + '[data-frade-upper-glyph="1"]::before{content:"";position:absolute;width:18px;height:18px;left:calc(50% - 9px);top:calc(50% - 9px);mask-image:var(--frade-upper-icon-image);mask-size:contain;mask-position:center;mask-repeat:no-repeat;background-color:var(--frade-frame-text-primary);pointer-events:none;forced-color-adjust:none;}';
    style.textContent += prefix('[data-frade-upper-control="1"]:focus-visible') + "," + prefix('[data-frade-upper-menu="1"] [data-frade-upper-row="1"]:focus-visible') + "{outline:2px solid var(--frade-frame-focus-ring)!important;outline-offset:2px;}" + prefix('[data-frade-upper-menu="1"]') + "{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;}" + prefix('[data-frade-upper-menu="1"] table') + "," + prefix('[data-frade-upper-menu="1"] tbody') + "," + prefix('[data-frade-upper-menu="1"] td') + "{background-color:inherit!important;color:inherit!important;}" + prefix('[data-frade-upper-menu="1"] td span') + "{color:inherit!important;}" + prefix('[data-frade-upper-menu="1"] [data-frade-upper-row="1"]') + "{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;}" + prefix('[data-frade-upper-menu="1"] [data-frade-upper-row="1"]:hover') + "," + prefix('[data-frade-upper-menu="1"] [data-frade-upper-row="1"]:focus-visible') + "{background-color:var(--frade-frame-surface-hover)!important;}" + prefix('[data-frade-upper-menu="1"] [aria-disabled="true"]') + "{color:var(--frade-frame-text-disabled)!important;}";
    return style;
  }
  const ownAttribute = (name, value) => {
    if (!attributes.has(name)) attributes.set(name, root.getAttribute(name));
    root.setAttribute(name, value);
  };
  const ownProperty = (name, value) => {
    if (!properties.has(name))
      properties.set(name, {
        value: root.style.getPropertyValue(name),
        priority: root.style.getPropertyPriority(name)
      });
    root.style.setProperty(name, value);
  };
  const lowerAttributes = /* @__PURE__ */ new Map(), menuAttributes = /* @__PURE__ */ new Map(), lowerStyles = /* @__PURE__ */ new Map(), menuStyles = /* @__PURE__ */ new Map(), styleAttributePresence = /* @__PURE__ */ new WeakMap();
  let menuLayout;
  const layoutProperties = /* @__PURE__ */ new Set(["left", "top", "width", "max-width", "white-space", "overflow-wrap"]);
  let lowerObserver, lowerTargets = [], canvasFocus, lastLower, mouseSequence = 0, popup, cancellationPopup;
  const projectAttribute = (map, node, name, value) => {
    let prior = map.get(node);
    if (!prior) {
      prior = /* @__PURE__ */ new Map();
      map.set(node, prior);
    }
    if (!prior.has(name)) prior.set(name, node.getAttribute(name));
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  };
  const restoreAttributes = (map, keep) => {
    for (const [node, values] of map) {
      if (keep?.has(node)) continue;
      for (const [name, value] of values) {
        if (value === null) node.removeAttribute(name);
        else node.setAttribute(name, value);
      }
      map.delete(node);
    }
  };
  const projectStyle = (node, name, value, map = lowerStyles) => {
    let prior = map.get(node);
    if (!prior) {
      prior = /* @__PURE__ */ new Map();
      map.set(node, prior);
      styleAttributePresence.set(node, node.hasAttribute("style"));
    }
    if (!prior.has(name))
      prior.set(name, {
        value: node.style.getPropertyValue(name),
        priority: node.style.getPropertyPriority(name)
      });
    if (node.style.getPropertyValue(name) !== value || node.style.getPropertyPriority(name) !== "important")
      node.style.setProperty(name, value, "important");
  };
  const restoreLowerStyles = (map = lowerStyles, keep) => {
    for (const [node, values] of map) {
      if (keep?.has(node)) continue;
      for (const [name, value] of values) {
        if (value.value) node.style.setProperty(name, value.value, value.priority);
        else node.style.removeProperty(name);
      }
      if (!node.style.length) {
        if (styleAttributePresence.get(node)) node.setAttribute("style", "");
        else node.removeAttribute("style");
      }
      styleAttributePresence.delete(node);
      map.delete(node);
    }
  };
  const currentPresentation = () => !disposed && !!active && root.getAttribute("data-frade-frame-runtime") === "1" && owner?.participantGeneration === active.request.participantGeneration && sameOwner(owner?.context, active.request.context);
  const visible = (node) => {
    if (!node.isConnected) return false;
    for (let element = node; element && element !== root; element = element.parentElement) {
      const style = window.getComputedStyle(element);
      if (element.hasAttribute("hidden") || style.display === "none" || style.visibility === "hidden")
        return false;
    }
    return true;
  };
  const registered = (node, name) => Array.isArray(node?.mxListenerList) && node.mxListenerList.some((entry) => entry.name === name && typeof entry.f === "function");
  const gestureNames = () => globals.mxClient?.IS_POINTER === true ? ["pointerdown", "pointerup", "pointermove"] : ["mousedown", "mouseup", "mousemove"];
  const gestureOwner = (target) => {
    const [down, up] = gestureNames();
    for (let node = target; node && node !== ui?.tabContainer?.parentElement; node = node.parentElement) {
      if (registered(node, down) && registered(node, up)) return node;
      if (node === ui?.tabContainer) break;
    }
    return void 0;
  };
  const originallyDisabled = (target) => {
    for (let node = target; node && node !== root; node = node.parentElement) {
      const prior = lowerAttributes.get(node) || menuAttributes.get(node);
      const aria = prior?.has("aria-disabled") ? prior.get("aria-disabled") : node.getAttribute("aria-disabled");
      if (node.classList.contains("mxDisabled") || node.hasAttribute("disabled") || aria === "true")
        return true;
    }
    return false;
  };
  const capable = (target) => visible(target) && !originallyDisabled(target) && (registered(target, "click") || !!gestureOwner(target));
  const lowerReady = () => currentPresentation() && ui?.tabContainer instanceof HTMLElement && visible(ui.tabContainer) && typeof graph?.isEnabled === "function" && graph.isEnabled() && typeof graph.isEditing === "function" && !graph.isEditing() && !graph.isMouseDown && !ui.dialog && !(ui.dialogs?.length > 0);
  function forgetPopup(cancel = false) {
    const original = popup || cancellationPopup;
    const proven = !!original && ui?.currentMenu === original.instance && original.instance.div === original.div && original.div.isConnected;
    if (cancel && proven) original.hide();
    cancellationPopup = !cancel && proven ? original : void 0;
    menuLayout = void 0;
    restoreLowerStyles(menuStyles);
    restoreAttributes(menuAttributes);
    if (original?.opener.isConnected && lowerAttributes.has(original.opener))
      projectAttribute(lowerAttributes, original.opener, "aria-expanded", "false");
    popup = void 0;
  }
  const validPopup = () => !!popup && currentPresentation() && popup.request === active.request && ui?.currentMenu === popup.instance && popup.instance.div === popup.div && visible(popup.div) && lowerTargets.includes(popup.opener) && capable(popup.opener);
  function reconcileLower() {
    if (!currentPresentation()) return;
    const strip = ui?.tabContainer;
    if (!(strip instanceof HTMLElement) || !strip.isConnected) {
      lowerTargets = [];
      restoreAttributes(lowerAttributes);
      restoreLowerStyles(lowerStyles);
      forgetPopup();
      return;
    }
    const keep = /* @__PURE__ */ new Set([strip]), next = [];
    const own = (node, name, value) => {
      keep.add(node);
      projectAttribute(lowerAttributes, node, name, value);
    };
    own(strip, "role", "group");
    const pagesName = globals.mxResources?.get?.("pages") || strip.getAttribute("title");
    if (pagesName) own(strip, "aria-label", pagesName);
    const target = (node, label, selected, menu = false) => {
      if (!label) return;
      own(node, "role", "button");
      own(node, "aria-label", label);
      const enabled = capable(node);
      own(node, "aria-disabled", String(!enabled));
      own(node, "tabindex", enabled ? "0" : "-1");
      if (selected !== void 0) own(node, "aria-pressed", String(selected));
      if (menu) {
        own(node, "aria-haspopup", "menu");
        own(node, "aria-expanded", String(popup?.opener === node && validPopup()));
      }
      if (enabled) next.push(node);
    };
    for (const child of Array.from(
      strip.querySelectorAll(".geControlTab,.gePageTab")
    )) {
      if (child.classList.contains("gePageTab")) {
        const label = child.querySelector("span"), icon = child.querySelector(".geButton");
        own(child, "role", "group");
        const name = label?.textContent?.trim() || child.getAttribute("title") || "";
        if (name) own(child, "aria-label", name);
        if (label) target(label, name, child.classList.contains("geActivePage"));
        if (icon && pagesName) target(icon, name + " — " + pagesName, void 0, true);
      } else {
        let name = child.getAttribute("title") || "";
        if (!name && child === ui.leftScrollTab)
          name = globals.mxResources?.get?.("previousPage") || "";
        if (!name && child === ui.rightScrollTab)
          name = globals.mxResources?.get?.("nextPage") || "";
        target(child, name, void 0, child === ui.pageMenuTab);
        for (const decorative of Array.from(child.querySelectorAll(".geButton")))
          own(decorative, "aria-hidden", "true");
      }
    }
    lowerTargets = next;
    restoreAttributes(lowerAttributes, keep);
    if (popup && !validPopup()) forgetPopup();
    const glyphs = new Set(strip.querySelectorAll(".geButton"));
    for (const icon of glyphs) {
      const image = icon.style.backgroundImage;
      if (image && image !== "none" && !lowerStyles.has(icon)) {
        projectStyle(icon, "--frade-lower-icon-image", image);
        projectStyle(icon, "background-image", "none");
      }
    }
    restoreLowerStyles(lowerStyles, glyphs);
    if (popup) reconcilePopup();
  }
  function menuScopes() {
    const result = [];
    if (!validPopup()) return result;
    const visit = (scope, div, parent, row) => {
      if (!visible(div) || !(scope.tbody instanceof HTMLElement) || !div.contains(scope.tbody))
        return;
      result.push({ scope, div, parent, row });
      for (const child of Array.from(scope.tbody.children)) {
        if (child.div instanceof HTMLElement && child.tbody && scope.activeRow === child && child.div.isConnected)
          visit(child, child.div, scope, child);
      }
    };
    visit(popup.instance, popup.div);
    return result;
  }
  function restoreMenuLayout() {
    for (const [node, values] of menuStyles) {
      for (const [name, prior] of values) {
        if (!layoutProperties.has(name)) continue;
        if (prior.value) node.style.setProperty(name, prior.value, prior.priority);
        else node.style.removeProperty(name);
        values.delete(name);
      }
      if (values.size) continue;
      if (!node.style.length) {
        if (styleAttributePresence.get(node)) node.setAttribute("style", "");
        else node.removeAttribute("style");
      }
      styleAttributePresence.delete(node);
      menuStyles.delete(node);
    }
  }
  let refusedLowerRequest;
  function reflowPopup(entries, keep) {
    if (!validPopup() || !entries.length) return false;
    const nodes = entries.map((entry) => entry.div), width = window.innerWidth, height = window.innerHeight;
    const measure = () => nodes.map((node) => node.getBoundingClientRect());
    const rectangles = (boxes) => JSON.stringify(boxes.map((b) => [b.left, b.top, b.width, b.height]));
    const current = measure();
    if (!(width > 0 && height > 0) || current.some((b) => !(b.width > 0 && b.height > 0))) return true;
    const key = JSON.stringify([
      width,
      height,
      active.snapshot.density,
      typeof window.matchMedia === "function" && window.matchMedia("(pointer:coarse)").matches,
      ...entries.map((entry) => {
        const cell = entry.scope.tbody.querySelector("td:nth-child(2)");
        const css = cell ? window.getComputedStyle(cell) : void 0;
        return [entry.scope.tbody.textContent, css?.fontSize, css?.lineHeight];
      })
    ]);
    if (menuLayout?.key === key && menuLayout.boxes === rectangles(current) && menuLayout.nodes.length === nodes.length && menuLayout.nodes.every((node, n) => node === nodes[n])) return true;
    restoreMenuLayout();
    const natural = measure(), gap = 8, clearance = 4;
    const targetBoxes = () => entries.map((entry) => Array.from(entry.scope.tbody.children).filter((row) => row.getAttribute("role")?.startsWith("menuitem") && visible(row)).map((row) => ({ row, box: row.getBoundingClientRect() })));
    const fits = () => {
      if (measure().some((b) => b.left < 0 || b.top < 0 || b.right > width || b.bottom > height)) return false;
      const targets = targetBoxes();
      for (const group of targets) for (const { row, box: b } of group) {
        if (b.left < clearance || b.top < clearance || b.right + clearance > width || b.bottom + clearance > height) return false;
        if (typeof document.elementFromPoint === "function") {
          const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          if (!hit || hit !== row && !row.contains(hit)) return false;
        }
      }
      for (let a = 0; a < targets.length; a++) for (let b = a + 1; b < targets.length; b++)
        for (const x of targets[a]) for (const y of targets[b]) {
          const r = x.box, t = y.box;
          if (!(r.right + gap <= t.left || t.right + gap <= r.left || r.bottom + gap <= t.top || t.bottom + gap <= r.top)) return false;
        }
      return true;
    };
    const settle = () => {
      menuLayout = { nodes, key, boxes: rectangles(measure()) };
    };
    if (fits()) {
      settle();
      return true;
    }
    const project = (node, name, value) => {
      keep.add(node);
      projectStyle(node, name, value, menuStyles);
    };
    const px = (value) => Number.parseFloat(value) || 0;
    const profile = entries.map((entry, n) => {
      const table = entry.div.querySelector("table"), box = table.getBoundingClientRect();
      const inset = Math.max(0, natural[n].width - box.width);
      const labels2 = Array.from(entry.scope.tbody.children).filter((row) => row.getAttribute("role")?.startsWith("menuitem")).map((row) => {
        const cells = Array.from(row.children), cell = cells[1], css = window.getComputedStyle(cell);
        const reserved = cells.filter((node) => node !== cell).reduce((sum, node) => sum + node.getBoundingClientRect().width, 0);
        const padding = px(css.paddingLeft) + px(css.paddingRight) + px(css.borderLeftWidth) + px(css.borderRightWidth);
        return { cell, reserved, padding };
      });
      return { table, inset, labels: labels2, minimum: Math.max(44 + inset, ...labels2.map((label) => inset + label.reserved + label.padding + 1)) };
    });
    const available = width - clearance * 2 - gap * (nodes.length - 1);
    const refuse = () => {
      const request = active.request, opener = popup?.opener;
      forgetPopup(true);
      focusNode(opener);
      if (refusedLowerRequest !== request) {
        refusedLowerRequest = request;
        reply(request, "REFUSED", "LOWER_MENU_REFLOW_UNAVAILABLE: original targets cannot fit without forbidden behavior");
      }
      return false;
    };
    if (available < profile.reduce((sum, p) => sum + p.minimum, 0)) return refuse();
    const widths = natural.map((b) => b.width);
    if (widths.reduce((sum, w) => sum + w, 0) > available) {
      const total = widths.reduce((sum, w) => sum + w, 0), spare = available - profile.reduce((sum, p) => sum + p.minimum, 0);
      for (let n = 0; n < widths.length; n++) widths[n] = Math.floor(profile[n].minimum + spare * natural[n].width / total);
      for (let n = 0; n < nodes.length; n++) {
        project(nodes[n], "width", widths[n] + "px");
        project(nodes[n], "max-width", widths[n] + "px");
        project(profile[n].table, "width", Math.max(1, widths[n] - profile[n].inset) + "px");
        project(profile[n].table, "max-width", Math.max(1, widths[n] - profile[n].inset) + "px");
        for (const { cell, reserved, padding } of profile[n].labels) {
          const textWidth = Math.max(1, widths[n] - profile[n].inset - reserved - padding);
          project(cell, "width", textWidth + "px");
          project(cell, "max-width", textWidth + "px");
          project(cell, "white-space", "normal");
          project(cell, "overflow-wrap", "anywhere");
        }
      }
    }
    for (let pass = 0; pass < 3; pass++) {
      const boxes = measure(), extent = boxes.reduce((sum, b) => sum + b.width, 0) + gap * (nodes.length - 1);
      if (extent > width - clearance * 2 || boxes.some((b) => b.height > height - clearance * 2)) return refuse();
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
      const right = clamp(natural[0].left, clearance, width - clearance - extent);
      const leftOffset = extent - boxes[0].width;
      const left = clamp(natural[0].left, clearance + leftOffset, width - clearance - boxes[0].width);
      const direction = Math.abs(right - natural[0].left) <= Math.abs(left - natural[0].left) ? 1 : -1;
      let x = direction === 1 ? right : left;
      for (let n = 0; n < nodes.length; n++) {
        if (n && direction < 0) x -= boxes[n].width + gap;
        const y = Math.floor(clamp(natural[n].top, clearance, height - clearance - boxes[n].height));
        const move = (name, target, currentValue) => {
          if (Math.abs(target - currentValue) < 1e-3) return;
          const original = Number.parseFloat(nodes[n].style[name]);
          const origin = Number.isFinite(original) ? original : name === "left" ? nodes[n].offsetLeft : nodes[n].offsetTop;
          project(nodes[n], name, origin + target - currentValue + "px");
        };
        move("left", x, boxes[n].left);
        move("top", y, boxes[n].top);
        if (direction > 0) x += boxes[n].width + gap;
      }
      if (fits()) {
        settle();
        return true;
      }
    }
    return refuse();
  }
  function reconcilePopup() {
    if (!validPopup()) {
      forgetPopup();
      return false;
    }
    const keep = /* @__PURE__ */ new Set(), own = (node, name, value) => {
      keep.add(node);
      projectAttribute(menuAttributes, node, name, value);
    };
    const scopes = menuScopes();
    for (const entry of scopes) {
      own(entry.div, "data-frade-lower-menu", String(active.request.participantGeneration));
      own(entry.div, "role", "menu");
      own(entry.div, "aria-label", popup.opener.getAttribute("aria-label") || "");
      for (const table of Array.from(entry.div.querySelectorAll("table,tbody")))
        own(table, "role", "presentation");
      for (const row of Array.from(entry.scope.tbody.children)) {
        const cells = Array.from(row.children), label = cells[1]?.textContent?.trim() || "";
        if (!label) {
          own(row, "role", "separator");
          continue;
        }
        const disabled = cells.some((cell) => cell.classList.contains("mxDisabled")) || !registered(row, gestureNames()[0]) || !registered(row, gestureNames()[1]);
        const checkmark = globals.Editor?.checkmarkImage;
        const checked = typeof checkmark === "string" && !!checkmark && !!cells[1] && Array.from(cells[1].querySelectorAll("div,img")).some(
          (node) => (menuStyles.get(node)?.get("background-image")?.value || node.style.backgroundImage).includes(checkmark) || node instanceof HTMLImageElement && node.src === checkmark
        );
        own(row, "role", checked ? "menuitemcheckbox" : "menuitem");
        if (checked) own(row, "aria-checked", "true");
        else {
          const prior = menuAttributes.get(row);
          if (prior?.has("aria-checked")) {
            const value = prior.get("aria-checked");
            if (value === null) row.removeAttribute("aria-checked");
            else if (value !== void 0) row.setAttribute("aria-checked", value);
            prior.delete("aria-checked");
          }
        }
        own(row, "aria-label", label);
        own(row, "aria-disabled", String(disabled));
        own(row, "tabindex", disabled ? "-1" : "0");
        const sub = row.div;
        if (sub instanceof HTMLElement && row.tbody) {
          own(row, "aria-haspopup", "menu");
          own(row, "aria-expanded", String(entry.scope.activeRow === row && sub.isConnected));
        }
        for (const cell of cells) own(cell, "role", "presentation");
        if (cells[0]) own(cells[0], "aria-hidden", "true");
        if (cells[2]) own(cells[2], "aria-hidden", "true");
        for (const icon of Array.from(
          row.querySelectorAll("td.mxPopupMenuIcon img,td.mxPopupMenuItem>div")
        )) {
          const glyph = icon instanceof HTMLImageElement ? icon.parentElement : icon;
          const image = icon instanceof HTMLImageElement ? 'url("' + icon.src + '")' : menuStyles.get(glyph)?.get("background-image")?.value || icon.style.backgroundImage;
          if (!image || image === "none") continue;
          keep.add(glyph);
          keep.add(icon);
          own(icon, "aria-hidden", "true");
          if (!menuStyles.has(glyph)) {
            projectStyle(glyph, "mask-image", image, menuStyles);
            projectStyle(glyph, "mask-repeat", "no-repeat", menuStyles);
            projectStyle(glyph, "mask-position", "center", menuStyles);
            projectStyle(glyph, "mask-size", icon.style.backgroundSize || "16px 16px", menuStyles);
            projectStyle(glyph, "background-image", "none", menuStyles);
            projectStyle(glyph, "background-color", "currentColor", menuStyles);
            projectStyle(glyph, "forced-color-adjust", "none", menuStyles);
            if (icon instanceof HTMLImageElement)
              projectStyle(icon, "visibility", "hidden", menuStyles);
          }
        }
      }
    }
    if (!reflowPopup(scopes, keep)) return false;
    restoreAttributes(menuAttributes, keep);
    restoreLowerStyles(menuStyles, keep);
    return true;
  }
  const rows = (scope) => Array.from(scope.tbody.children).filter(
    (node) => node instanceof HTMLElement && visible(node) && node.getAttribute("aria-disabled") === "false"
  );
  const focusNode = (node) => {
    if (!node || !visible(node) || node.closest('.mxDisabled,[disabled],[aria-disabled="true"]'))
      return;
    const scroller = ui?.tabScroller;
    if (currentPresentation() && lowerTargets.includes(node) && scroller instanceof HTMLElement && ui.tabContainer.contains(scroller) && scroller.contains(node) && scroller.clientWidth > 0) {
      const target = node.getBoundingClientRect(), box = scroller.getBoundingClientRect(), left = box.left + scroller.clientLeft + 4, right = box.left + scroller.clientLeft + scroller.clientWidth - 4;
      const delta = target.left < left ? target.left - left : target.right > right ? target.right - right : 0;
      if (delta) scroller.scrollLeft += delta;
    }
    node.focus({ preventScroll: true });
  };
  function adoptPopup(opener, previous, keyboard) {
    const instance = ui?.currentMenu;
    if (validPopup() && popup.instance === instance && popup.opener === opener) return;
    if (!lowerReady() || !lowerTargets.includes(opener) || !capable(opener) || !instance || instance === previous || !(instance.div instanceof HTMLElement) || !instance.div.isConnected || !instance.tbody || !instance.div.contains(instance.tbody) || typeof ui.hideCurrentMenu !== "function")
      return;
    forgetPopup();
    const hide = ui.hideCurrentMenu;
    popup = {
      instance,
      div: instance.div,
      opener,
      request: active.request,
      hide: () => hide.call(ui)
    };
    cancellationPopup = popup;
    if (!reconcilePopup()) return;
    projectAttribute(lowerAttributes, opener, "aria-expanded", "true");
    if (keyboard) focusNode(rows(instance)[0]);
  }
  function originalGesture(target, moveOnly = false) {
    const names = gestureNames(), ownerNode = gestureOwner(target);
    if (!ownerNode) return false;
    const box = target.getBoundingClientRect(), init = {
      bubbles: true,
      cancelable: true,
      clientX: box.left + box.width / 2,
      clientY: box.bottom,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
      isPrimary: true
    };
    const Constructor = globals.mxClient?.IS_POINTER === true ? globals.PointerEvent : globals.MouseEvent;
    if (typeof Constructor !== "function" || moveOnly && !registered(ownerNode, names[2]))
      return false;
    for (const name of moveOnly ? [names[2]] : names.slice(0, 2))
      target.dispatchEvent(new Constructor(name, { ...init, buttons: name.endsWith("up") ? 0 : 1 }));
    return true;
  }
  function returnAfterAction(opener, label) {
    if (!lowerReady() || popup) return;
    const request = active.request, sequence = mouseSequence;
    const restore = () => {
      if (!lowerReady() || active.request !== request || popup || sequence !== mouseSequence) return;
      const matches = lowerTargets.filter((node) => node.getAttribute("aria-label") === label);
      const target = lowerTargets.includes(opener) ? opener : matches.length === 1 ? matches[0] : lowerTargets[0];
      focusNode(target || canvasFocus);
      if (target) lastLower = target;
    };
    restore();
    window.requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (focused === document.body || focused === ui.typingShim || focused === graph.container || focused === opener || lowerTargets.includes(focused))
        restore();
    });
  }
  const openerIdentity = (target) => {
    const page = target.closest(".gePageTab");
    return {
      kind: page ? target.tagName === "SPAN" ? "page" : "page-menu" : "control",
      title: page?.getAttribute("title") || target.getAttribute("title") || "",
      menu: target.getAttribute("aria-haspopup") === "menu"
    };
  };
  const connectedOpener = (original, identity22) => {
    if (lowerTargets.includes(original) && capable(original)) return original;
    if (!identity22.title) return void 0;
    const matches = lowerTargets.filter((node) => {
      const candidate = openerIdentity(node);
      return candidate.kind === identity22.kind && candidate.title === identity22.title && candidate.menu === identity22.menu && capable(node);
    });
    return matches.length === 1 ? matches[0] : void 0;
  };
  function activateLower(target) {
    if (!lowerReady() || !capable(target)) return;
    const previous = ui.currentMenu, identity22 = openerIdentity(target), label = target.getAttribute("aria-label") || "";
    if (registered(target, "click")) {
      const box = target.getBoundingClientRect();
      target.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          clientX: box.left + box.width / 2,
          clientY: box.top + box.height / 2,
          button: 0
        })
      );
    } else originalGesture(target);
    reconcileLower();
    const replacement = connectedOpener(target, identity22);
    if (identity22.menu && replacement) adoptPopup(replacement, previous, true);
    returnAfterAction(target, label);
  }
  const moveFocus = (targets, current, key) => {
    const index = targets.indexOf(current);
    if (!targets.length) return;
    focusNode(
      targets[key === "Home" ? 0 : key === "End" ? targets.length - 1 : (index + (["ArrowLeft", "ArrowUp"].includes(key) ? -1 : 1) + targets.length) % targets.length]
    );
  };
  function lowerKey(event) {
    if (!currentPresentation()) {
      forgetPopup();
      return false;
    }
    const target = event.target;
    if (!target || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || !lowerReady())
      return false;
    reconcileLower();
    const editable = target.closest(
      'input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"]'
    );
    const idleShim = target === ui.typingShim && target.classList.contains("mxTypingShim") && !target.value && !graph.isEditing();
    if (editable && !idleShim) return false;
    if (popup) {
      const entry = menuScopes().find((value) => value.scope.tbody.contains(target));
      if (!entry) return false;
      const current = target.closest("tr");
      if (!current || !rows(entry.scope).includes(current)) return false;
      if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key))
        moveFocus(rows(entry.scope), current, event.key);
      else if (event.key === "ArrowRight" && current.div) {
        if (!originalGesture(current, true)) originalGesture(current);
        if (reconcilePopup()) focusNode(rows(current)[0]);
      } else if ((event.key === "ArrowLeft" || event.key === "Escape") && entry.parent) {
        const hide = popup.instance.hideSubmenu;
        if (typeof hide !== "function") return false;
        hide.call(popup.instance, entry.parent);
        if (reconcilePopup()) focusNode(entry.row);
      } else if (event.key === "Escape" || event.key === "Tab") {
        const old = popup;
        old.hide();
        forgetPopup();
        focusNode(old.opener);
        if (event.key === "Tab") {
          event.stopPropagation();
          return false;
        }
      } else if (event.key === "Enter" || event.key === " ") {
        if (!event.repeat) {
          const opener = popup.opener, label = opener.getAttribute("aria-label") || "";
          originalGesture(current);
          reconcileLower();
          if (popup) reconcilePopup();
          else returnAfterAction(opener, label);
        }
      } else return false;
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    if (ui.currentMenu?.div?.isConnected) return false;
    if (event.key === "Escape" && lowerTargets.includes(target))
      focusNode(canvasFocus?.isConnected ? canvasFocus : ui.typingShim);
    else if (event.key === "F6") {
      if (lowerTargets.includes(target))
        focusNode(canvasFocus?.isConnected ? canvasFocus : ui.typingShim);
      else {
        canvasFocus = target;
        focusNode(lastLower && lowerTargets.includes(lastLower) ? lastLower : lowerTargets[0]);
      }
    } else if (lowerTargets.includes(target) && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
      moveFocus(lowerTargets, target, event.key);
    else if (lowerTargets.includes(target) && (event.key === "Enter" || event.key === " ")) {
      if (!event.repeat) activateLower(target);
    } else return false;
    if (lowerTargets.includes(document.activeElement))
      lastLower = document.activeElement;
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
  const lowerMouse = (event) => {
    if (event.isTrusted && ["mousedown", "pointerdown"].includes(event.type)) ++mouseSequence;
    if (!lowerReady()) return;
    const target = event.target, opener = lowerTargets.find((node) => node === target || node.contains(target));
    if (!opener || !capable(opener)) return;
    const identity22 = openerIdentity(opener);
    if (!identity22.menu) return;
    const previous = ui.currentMenu, request = active.request;
    queueMicrotask(() => {
      if (active?.request === request) {
        reconcileLower();
        const replacement = connectedOpener(opener, identity22);
        if (replacement) adoptPopup(replacement, previous, false);
      }
    });
  };
  const lowerResize = () => {
    reconcileLower();
    reconcileUpperFocus();
  };
  const upperControls = /* @__PURE__ */ new Map(), upperControlProjection = /* @__PURE__ */ new Map(), upperMenuProjection = /* @__PURE__ */ new Map();
  let upperPopup, upperGestureSequence = 0;
  let upperGestureTimer;
  let upperFocusRing, upperFocusAnchor, upperFocusQueued = false;
  function clearUpperFocus() {
    upperFocusRing?.remove();
    upperFocusRing = void 0;
    upperFocusAnchor = void 0;
  }
  function reconcileUpperFocus() {
    if (disposed || !upperRootOwned()) {
      clearUpperFocus();
      return;
    }
    const node = document.activeElement, control = node instanceof HTMLElement ? upperControlProof(node) : void 0;
    if (!document.hasFocus() || ui?.dialog || ui?.dialogs?.length || ui?.currentMenu?.div?.isConnected || !(node instanceof HTMLElement) || !control || upperDisabled(node, control) || !node.matches(":focus-visible")) {
      clearUpperFocus();
      return;
    }
    const host = node.closest(".geToolbarContainer"), bounds = node.getBoundingClientRect();
    if (!host?.isConnected || !document.body?.isConnected || ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) {
      clearUpperFocus();
      return;
    }
    if (upperFocusRing && upperFocusAnchor !== node) clearUpperFocus();
    if (!currentPresentation()) {
      if (upperFocusRing && (upperFocusRing.style.left !== bounds.left - 5 + "px" || upperFocusRing.style.top !== bounds.top - 5 + "px" || upperFocusRing.style.width !== bounds.width + 10 + "px" || upperFocusRing.style.height !== bounds.height + 10 + "px")) clearUpperFocus();
      return;
    }
    const style = getComputedStyle(node), corners = ["top-left", "top-right", "bottom-right", "bottom-left"];
    const radii = corners.map((corner) => style.getPropertyValue("border-" + corner + "-radius") || "0px");
    if (radii.some((radius) => !/^\d+(?:\.\d+)?px$/.test(radius))) {
      clearUpperFocus();
      return;
    }
    if (!upperFocusRing || upperFocusRing.parentElement !== document.body) {
      clearUpperFocus();
      upperFocusRing = document.createElement("div");
      upperFocusRing.setAttribute("data-frade-upper-focus-ring", "1");
      upperFocusRing.setAttribute("aria-hidden", "true");
      upperFocusRing.setAttribute("inert", "");
      upperFocusRing.style.cssText = "position:fixed;pointer-events:none;opacity:1;background:transparent;border-width:4px;border-style:solid;border-color:var(--frade-frame-surface-panel)!important;padding:0;margin:0;box-sizing:border-box;z-index:4;clip-path:inset(0px 1px);outline:none!important;box-shadow:none!important;forced-color-adjust:none;";
      const contour2 = document.createElement("div");
      contour2.style.cssText = "position:absolute;left:1px;top:1px;pointer-events:none;background:transparent;border:0;padding:0;margin:0;box-sizing:border-box;outline:2px solid var(--frade-frame-focus-ring);outline-offset:2px;";
      upperFocusRing.append(contour2);
      document.body.append(upperFocusRing);
    }
    upperFocusAnchor = node;
    const contour = upperFocusRing.firstElementChild;
    const update = (element, values) => {
      for (const [name, value] of Object.entries(values)) if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
    };
    update(upperFocusRing, { left: bounds.left - 5 + "px", top: bounds.top - 5 + "px", width: bounds.width + 10 + "px", height: bounds.height + 10 + "px" });
    update(contour, { width: bounds.width + "px", height: bounds.height + "px" });
    corners.forEach((corner, index) => {
      update(upperFocusRing, { ["border-" + corner + "-radius"]: parseFloat(radii[index]) + 5 + "px" });
      update(contour, { ["border-" + corner + "-radius"]: radii[index] });
    });
  }
  const upperFocusChanged = () => {
    if (upperFocusQueued || disposed) return;
    upperFocusQueued = true;
    queueMicrotask(() => {
      upperFocusQueued = false;
      reconcileUpperFocus();
    });
  };
  function upperAttribute(map, node, name, value) {
    let saved = map.get(node);
    if (!saved) {
      saved = /* @__PURE__ */ new Map();
      map.set(node, saved);
    }
    let property = saved.get(name);
    if (!property) {
      property = { before: node.getAttribute(name), last: value };
      saved.set(name, property);
    } else if (node.getAttribute(name) !== property.last) return;
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
    property.last = value;
  }
  function restoreUpperProjection(map, keep) {
    for (const [node, saved] of map) {
      if (keep?.has(node)) continue;
      for (const [name, property] of saved) if (node.getAttribute(name) === property.last) {
        if (property.before === null) node.removeAttribute(name);
        else node.setAttribute(name, property.before);
      }
      map.delete(node);
    }
  }
  const upperClickHandlers = (node) => Array.isArray(node.mxListenerList) ? node.mxListenerList.filter((entry) => entry.name === "click" && typeof entry.f === "function").map((entry) => entry.f) : [];
  function upperControlProof(node) {
    const source = upperOwners.get(node), control = upperControls.get(node);
    if (!source || !control || !visible(node) || !node.matches(upperSelector) || node.className !== source.className || node.getAttribute("data-frade-upper-glyph") !== "1" || Array.from(source.properties).some(([name, value]) => !upperPropertyMatches(node, name, value))) return;
    const handlers = upperClickHandlers(node);
    if (!handlers.length || handlers.length !== control.handlers.length || handlers.some((handler, i) => handler !== control.handlers[i])) return;
    if (control.kind === "menu" && typeof node.enabled !== "boolean") return;
    if (control.kind === "freehand" && (graph?.freehand !== control.freehand || graph?.freehand?.isDrawing !== control.drawing)) return;
    return control;
  }
  const upperDisabled = (node, control) => node.hasAttribute("disabled") || node.classList.contains("mxDisabled") || (control.kind === "menu" ? node.enabled === false : typeof graph?.isEnabled !== "function" || !graph.isEnabled());
  const upperInteractionReady = () => !disposed && currentPresentation() && upperRootOwned() && !active.upperPending && !graph?.isEditing?.() && !graph?.isMouseDown && !ui?.dialog && !(ui?.dialogs?.length > 0);
  function upperPopupStructure(value) {
    return ui?.currentMenu === value.instance && ui.currentMenuElt === value.opener && value.instance.div === value.div && value.instance.tbody === value.tbody && value.div.isConnected && value.div.contains(value.tbody) && value.instance.hideMenu === value.hide && value.instance.hideSubmenu === value.hideSubmenu && !!upperControlProof(value.opener);
  }
  function upperPanels(value) {
    const result = [], seen = /* @__PURE__ */ new Set();
    let rowCount = 0;
    const visit = (scope, div, tbody, parent, row) => {
      if (result.length >= 32 || seen.has(div) || !(tbody instanceof HTMLElement) || !div.isConnected || !div.contains(tbody) || tbody.tagName !== "TBODY") return false;
      seen.add(div);
      result.push({ scope, div, tbody, parent, row });
      const children = Array.from(tbody.children);
      rowCount += children.length;
      if (rowCount > 512) return false;
      for (const child of children) {
        if (!(child instanceof HTMLTableRowElement)) return false;
        const sub = child;
        if (sub.div?.isConnected && (scope.activeRow !== child || !(sub.div instanceof HTMLElement) || !visit(child, sub.div, sub.tbody, scope, child))) return false;
      }
      return !scope.activeRow || children.includes(scope.activeRow);
    };
    return visit(value.instance, value.div, value.tbody) ? result : void 0;
  }
  function forgetUpperPopup(cancel = false) {
    const previous = upperPopup;
    upperPopup = void 0;
    if (cancel && previous && upperPopupStructure(previous) && upperPanels(previous)) previous.hide.call(previous.instance);
    restoreUpperProjection(upperMenuProjection);
    if (previous && upperControlProjection.has(previous.opener)) upperAttribute(upperControlProjection, previous.opener, "aria-expanded", "false");
  }
  function clearUpperInteraction() {
    clearUpperFocus();
    ++upperGestureSequence;
    if (upperGestureTimer !== void 0) clearTimeout(upperGestureTimer);
    upperGestureTimer = void 0;
    forgetUpperPopup(true);
    restoreUpperProjection(upperControlProjection);
    upperControls.clear();
  }
  function upperPopupLive() {
    if (!upperPopup || !upperInteractionReady() || upperPopup.request !== active.request || !upperPopupStructure(upperPopup)) return false;
    const control = upperControlProof(upperPopup.opener);
    return !!control && !upperDisabled(upperPopup.opener, control);
  }
  function reconcileUpperMenu() {
    if (!upperPopup || !currentPresentation()) return;
    const panels = upperPopupLive() ? upperPanels(upperPopup) : void 0;
    if (!panels) {
      forgetUpperPopup();
      return;
    }
    const keep = /* @__PURE__ */ new Set(), own = (node, name, value) => {
      keep.add(node);
      upperAttribute(upperMenuProjection, node, name, value);
    };
    for (const entry of panels) {
      own(entry.div, "data-frade-upper-menu", "1");
      own(entry.div, "role", "menu");
      own(entry.div, "aria-label", upperPopup.opener.title);
      const table = entry.tbody.parentElement;
      if (table?.tagName === "TABLE") own(table, "role", "presentation");
      own(entry.tbody, "role", "presentation");
      for (const child of Array.from(entry.tbody.children)) {
        const row = child, label = row.cells[1]?.textContent?.trim() || "";
        if (!label) {
          own(row, "role", "separator");
          continue;
        }
        const disabled = Array.from(row.cells).some((cell) => cell.classList.contains("mxDisabled")) || !registered(row, gestureNames()[0]) || !registered(row, gestureNames()[1]);
        const checkmark = globals.Editor?.checkmarkImage;
        const checked = typeof checkmark === "string" && !!checkmark && Array.from(row.cells[1].querySelectorAll("div,img")).some((icon) => icon.style.backgroundImage.includes(checkmark) || icon instanceof HTMLImageElement && icon.src === checkmark);
        own(row, "data-frade-upper-row", "1");
        own(row, "role", checked ? "menuitemcheckbox" : "menuitem");
        own(row, "aria-label", label);
        own(row, "aria-disabled", String(disabled));
        own(row, "tabindex", "-1");
        if (checked) own(row, "aria-checked", "true");
        const sub = row;
        if (sub.div instanceof HTMLElement && sub.tbody instanceof HTMLElement && sub.div.contains(sub.tbody)) {
          own(row, "aria-haspopup", "menu");
          own(row, "aria-expanded", String(sub.div.isConnected && entry.scope.activeRow === row));
        }
        for (const cell of Array.from(row.cells)) {
          own(cell, "role", "presentation");
          own(cell, "aria-hidden", "true");
        }
      }
    }
    restoreUpperProjection(upperMenuProjection, keep);
  }
  function reconcileUpperInteraction() {
    if (disposed || !upperRootOwned()) {
      clearUpperInteraction();
      return;
    }
    if (!currentPresentation()) {
      reconcileUpperFocus();
      return;
    }
    const keep = /* @__PURE__ */ new Set();
    for (const [node, source] of upperOwners) {
      if (!visible(node)) continue;
      const hash = upperVerified.get(source.bytes), kind = hash === "e78bd38fea8a799c13ffc0fbbab4d9ca6a1ee0ee57360c68596b58e4fe68da9a" ? "freehand" : "menu";
      if (!upperControls.has(node)) {
        const handlers = upperClickHandlers(node);
        if (!handlers.length || !node.title.trim() || (kind === "menu" ? typeof node.enabled !== "boolean" : typeof graph?.freehand?.isDrawing !== "function")) continue;
        upperControls.set(node, { kind, handlers, ...kind === "freehand" ? { freehand: graph.freehand, drawing: graph.freehand.isDrawing } : {} });
      }
      const control = upperControlProof(node);
      if (!control) continue;
      keep.add(node);
      const own = (name, value) => upperAttribute(upperControlProjection, node, name, value), disabled = upperDisabled(node, control);
      own("data-frade-upper-control", "1");
      own("role", "button");
      own("tabindex", disabled ? "-1" : "0");
      own("aria-label", node.title);
      own("aria-disabled", String(disabled));
      if (control.kind === "menu") {
        own("aria-haspopup", "menu");
        own("aria-expanded", String(upperPopup?.opener === node && upperPopupStructure(upperPopup)));
      } else own("aria-pressed", String(control.drawing.call(control.freehand)));
    }
    restoreUpperProjection(upperControlProjection, keep);
    for (const node of upperControls.keys()) if (!keep.has(node)) upperControls.delete(node);
    reconcileUpperMenu();
    reconcileUpperFocus();
  }
  function upperFocus(node) {
    if (node && upperInteractionReady() && visible(node) && node.getAttribute("aria-disabled") !== "true") node.focus({ preventScroll: true });
  }
  const upperRows = (panel) => Array.from(panel.tbody.children).filter((node) => node instanceof HTMLElement && visible(node) && node.getAttribute("role")?.startsWith("menuitem") === true && node.getAttribute("aria-disabled") === "false");
  function adoptUpperPopup(opener, previous, request, keyboard = false) {
    const control = upperControlProof(opener), instance = ui?.currentMenu;
    if (!upperInteractionReady() || active.request !== request || control?.kind !== "menu" || upperDisabled(opener, control) || !instance || instance === previous || ui.currentMenuElt !== opener || !(instance.div instanceof HTMLElement) || !(instance.tbody instanceof HTMLElement) || typeof instance.hideMenu !== "function" || typeof instance.hideSubmenu !== "function") return;
    if (upperPopup?.instance === instance) return;
    forgetUpperPopup();
    const candidate = { instance, div: instance.div, tbody: instance.tbody, opener, request, hide: instance.hideMenu, hideSubmenu: instance.hideSubmenu };
    if (!upperPopupStructure(candidate) || !upperPanels(candidate)) return;
    upperPopup = candidate;
    reconcileUpperInteraction();
    if (keyboard && upperPopupLive()) upperFocus(upperRows(upperPanels(candidate)[0])[0]);
  }
  function upperMouse(event) {
    const target = event.target instanceof Element ? event.target.closest(upperSelector) : null;
    if (!target || !upperInteractionReady()) return;
    const control = upperControlProof(target);
    if (!control || upperDisabled(target, control) || !registered(target, event.type)) return;
    const request = active.request, previous = ui.currentMenu, sequence = ++upperGestureSequence;
    const observeOriginal = () => {
      if (sequence !== upperGestureSequence || !upperInteractionReady() || active.request !== request) return;
      if (control.kind === "menu") adoptUpperPopup(target, previous, request);
      reconcileUpperInteraction();
      if (upperPopup?.opener === target && upperGestureTimer !== void 0) {
        clearTimeout(upperGestureTimer);
        upperGestureTimer = void 0;
      }
    };
    if (upperGestureTimer !== void 0) clearTimeout(upperGestureTimer);
    upperGestureTimer = setTimeout(() => {
      upperGestureTimer = void 0;
      observeOriginal();
    }, 0);
    queueMicrotask(observeOriginal);
  }
  function upperKey(event) {
    if (!upperInteractionReady() || event.isComposing || event.keyCode === 229 || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey && event.key !== "Tab") return false;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"],[role="dialog"],[role="alertdialog"]')) return false;
    if (upperPopup && !upperPopupLive()) forgetUpperPopup();
    const panels = upperPopupLive() ? upperPanels(upperPopup) : void 0;
    if (upperPopup && !panels) {
      forgetUpperPopup();
      return false;
    }
    let handled = false;
    if (panels?.length) {
      const previous = upperPopup, row = target?.closest("tr"), entry = panels.find((panel) => !!row && row.parentElement === panel.tbody);
      if (event.key === "Escape" || event.key === "Tab") {
        const deepest = panels[panels.length - 1];
        if (event.key === "Escape" && deepest.parent && deepest.row) {
          previous.hideSubmenu.call(previous.instance, deepest.parent);
          reconcileUpperMenu();
          upperFocus(deepest.row);
        } else {
          forgetUpperPopup(true);
          reconcileUpperInteraction();
          upperFocus(previous.opener);
        }
        event.stopPropagation();
        if (event.key === "Tab") return true;
        handled = true;
      } else if (entry && row && row.getAttribute("aria-disabled") === "false") {
        const items = upperRows(entry), index = items.indexOf(row);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          upperFocus(items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]);
          handled = true;
        } else if (event.key === "ArrowRight" && row.div && originalGesture(row, true)) {
          reconcileUpperMenu();
          const nested = upperPopup && upperPanels(upperPopup)?.find((panel) => panel.row === row);
          if (nested) upperFocus(upperRows(nested)[0]);
          handled = true;
        } else if (event.key === "ArrowLeft" && entry.parent && entry.row) {
          previous.hideSubmenu.call(previous.instance, entry.parent);
          reconcileUpperMenu();
          upperFocus(entry.row);
          handled = true;
        } else if (["Enter", " "].includes(event.key) && originalGesture(row)) {
          reconcileUpperInteraction();
          if (!upperPopup) upperFocus(previous.opener);
          handled = true;
        }
      }
    } else {
      const node = target?.closest(upperSelector), control = node && upperControlProof(node);
      if (node && control && !upperDisabled(node, control) && (["Enter", " "].includes(event.key) || event.key === "ArrowDown" && control.kind === "menu")) {
        const previous = ui.currentMenu, request = active.request;
        node.click();
        if (control.kind === "menu") adoptUpperPopup(node, previous, request, true);
        reconcileUpperInteraction();
        handled = true;
      }
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
    return handled;
  }
  function clearLower() {
    forgetPopup(true);
    restoreAttributes(lowerAttributes);
    restoreLowerStyles();
    lowerTargets = [];
    lastLower = void 0;
    canvasFocus = void 0;
  }
  function createGrid() {
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), defs = document.createElementNS(ns, "defs"), pattern = document.createElementNS(ns, "pattern"), dot = document.createElementNS(ns, "circle"), rect = document.createElementNS(ns, "rect");
    const id = "frade-private-grid-" + ++patternSequence;
    svg.setAttribute("data-frade-private-grid", "1");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.pointerEvents = "none";
    pattern.setAttribute("id", id);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    dot.setAttribute("cx", "0");
    dot.setAttribute("cy", "0");
    dot.setAttribute("r", "0.6");
    pattern.append(dot);
    defs.append(pattern);
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "url(#" + id + ")");
    svg.append(defs, rect);
    return svg;
  }
  function syncProjection() {
    if (!active || !graph?.container) return;
    const container = graph.container, view = graph.view, canvas = view?.canvas;
    const layer = view?.backgroundPageShape?.node ?? ((canvas instanceof SVGElement ? canvas.ownerSVGElement : void 0) || canvas);
    if (layer && !masks.has(layer)) {
      masks.set(layer, layer.getAttribute("data-frade-presentation-grid-layer"));
      layer.setAttribute("data-frade-presentation-grid-layer", "1");
    }
    if (!overlay || overlay.parentElement !== container) {
      overlay = createGrid();
      const before = (canvas instanceof SVGElement ? canvas.ownerSVGElement : void 0) || canvas;
      container.insertBefore(overlay, before?.parentNode === container ? before : null);
    }
    const scale = Number(view?.scale ?? 1), translate = view?.translate ?? { x: 0, y: 0 }, size = Number(graph.gridSize ?? 10) * scale;
    if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(size) || size <= 0 || !Number.isFinite(translate.x) || !Number.isFinite(translate.y))
      throw Error("Invalid diagram view transform");
    overlay.setAttribute("width", String(Math.max(container.clientWidth, container.scrollWidth)));
    overlay.setAttribute("height", String(Math.max(container.clientHeight, container.scrollHeight)));
    const enabled = typeof graph.isGridEnabled === "function" ? graph.isGridEnabled() : true;
    overlay.style.display = enabled ? "" : "none";
    const pattern = overlay.querySelector("pattern"), dot = overlay.querySelector("circle");
    pattern.setAttribute("width", String(size));
    pattern.setAttribute("height", String(size));
    pattern.setAttribute("x", String(translate.x * scale));
    pattern.setAttribute("y", String(translate.y * scale));
    dot.setAttribute("fill", active.snapshot.effectiveColors["diagram.grid"]);
  }
  async function redraw() {
    if (!active || disposed || active.upperPending) return;
    const request = active.request, token = epoch;
    try {
      syncProjection();
      await paint();
      if (!disposed && token === epoch && active?.request === request) reply(request, "PAINTED");
    } catch (error) {
      if (!disposed && token === epoch)
        reply(request, "REFUSED", error instanceof Error ? error.message : String(error));
    }
  }
  const viewChanged = () => {
    void redraw();
  };
  function attach(instance) {
    ui = instance;
    graph = instance.editor?.graph;
    if (!graph?.container) return;
    lowerObserver = new MutationObserver(() => {
      reconcileLower();
      reconcileUpper();
    });
    lowerObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "title", "hidden", "disabled"],
      characterData: true
    });
    lowerObserver.observe(root, { attributes: true, attributeFilter: ["data-frade-frame-runtime", "data-frade-frame-revision"] });
    for (const event of ["scale", "translate", "scaleAndTranslate"])
      graph.view?.addListener?.(event, viewChanged);
    ui.editor?.addListener?.("pageSelected", viewChanged);
    graph.container.addEventListener("scroll", viewChanged);
    observer = new MutationObserver((records) => {
      if (records.some((record2) => {
        const target = record2.target;
        if (target === overlay || overlay?.contains(target)) return false;
        if (record2.type === "childList" && record2.removedNodes.length === 0 && Array.from(record2.addedNodes).every(
          (node) => node === overlay || overlay?.contains(node)
        ))
          return false;
        return true;
      }))
        viewChanged();
    });
    observer.observe(graph.container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"]
    });
  }
  function clearProjection() {
    clearUpper();
    clearLower();
    installedStyle?.remove();
    installedStyle = void 0;
    overlay?.remove();
    overlay = void 0;
    for (const [element, value] of masks) {
      if (value === null) element.removeAttribute("data-frade-presentation-grid-layer");
      else element.setAttribute("data-frade-presentation-grid-layer", value);
    }
    masks.clear();
    for (const [name, value] of attributes) {
      if (value === null) root.removeAttribute(name);
      else root.setAttribute(name, value);
    }
    attributes.clear();
    for (const [name, property] of properties) {
      if (property.value) root.style.setProperty(name, property.value, property.priority);
      else root.style.removeProperty(name);
    }
    properties.clear();
    if (root.style.length === 0) root.removeAttribute("style");
    prepared = void 0;
    active = void 0;
    chordUntil = 0;
  }
  async function apply(request, snapshot2, style) {
    const token = ++epoch;
    installedStyle?.remove();
    installedStyle = style;
    document.head.append(style);
    ownAttribute("data-frade-frame-runtime", "1");
    ownAttribute("data-frade-frame-theme", snapshot2.kind);
    ownAttribute("data-frade-frame-density", snapshot2.density);
    ownAttribute("data-frade-frame-revision", String(snapshot2.revision));
    for (const role of roles2)
      ownProperty("--frade-frame-" + role.replaceAll(".", "-"), snapshot2.effectiveColors[role]);
    forgetPopup(true);
    forgetUpperPopup(true);
    upperPaintedRequest = void 0;
    active = { request, snapshot: snapshot2, upperPending: true };
    reconcileLower();
    syncProjection();
    const verification = verifyUpper(request, token);
    if (verification) await verification;
    if (!upperLive(request, token)) return;
    const beforePaint = upperCandidates(true).filter((source) => upperVerified.has(source.bytes)).map((source) => ({ ...source, owner: upperOwners.get(source.node) }));
    await paint();
    if (upperLive(request, token)) {
      const afterPaint = upperCandidates(true).filter((source) => upperVerified.has(source.bytes));
      if (afterPaint.length !== beforePaint.length || afterPaint.some((source, i) => {
        const before = beforePaint[i], saved = before.owner;
        return source.node !== before.node || source.image !== before.image || source.bytes !== before.bytes || !saved || upperOwners.get(source.node) !== saved || saved.node !== source.node || saved.image !== source.image || saved.bytes !== source.bytes || source.node.className !== saved.className || source.node.getAttribute("data-frade-upper-glyph") !== "1" || Array.from(saved.properties).some(([name, value]) => !upperPropertyMatches(source.node, name, value));
      }))
        throw Error("Upper glyph ownership changed before painted acknowledgement");
      active.upperPending = false;
      upperPaintedRequest = request;
      reply(request, "PAINTED");
    }
  }
  function validRequest(value) {
    if (!fields2(value, [
      "action",
      "version",
      "participantId",
      "participantGeneration",
      "context",
      "operation",
      ...["prepare", "rollback"].includes(value.operation) ? ["snapshot"] : []
    ]) || value.action !== "fradePresentation" || value.version !== 1 || !identity2(value.participantId) || !integer2(value.participantGeneration) || value.participantGeneration < 1 || !validPhase(value.context) || !["prepare", "apply", "rollback", "release", "detach"].includes(value.operation))
      return false;
    const context = value.context;
    if (value.operation === "prepare" && !["prepare", "join", "rollback"].includes(context.phase) || value.operation === "apply" && !["apply", "join", "rollback"].includes(context.phase) || value.operation === "rollback" && context.phase !== "rollback")
      return false;
    if (["prepare", "rollback"].includes(value.operation) && !validSnapshot(value.snapshot, context))
      return false;
    if (owner && (context.sessionId !== owner.context.sessionId || value.participantId !== owner.participantId || value.participantGeneration < owner.participantGeneration || context.generation < owner.context.generation))
      return false;
    if (owner && value.participantGeneration > owner.participantGeneration && value.operation !== "prepare")
      return false;
    return true;
  }
  const receive = (event) => {
    if (disposed || event.source !== window.parent || event.origin !== parentOrigin || typeof event.data !== "string" || new TextEncoder().encode(event.data).byteLength > 32768)
      return;
    let value;
    try {
      value = JSON.parse(event.data);
    } catch {
      return;
    }
    if (value?.action === "configure" && !hooked && globals.EditorUi?.prototype) {
      hooked = true;
      prototype = globals.EditorUi.prototype;
      originalInit = prototype.init;
      installedInit = function(...args) {
        const result = originalInit.apply(this, args);
        attach(this);
        return result;
      };
      prototype.init = installedInit;
      return;
    }
    if (value?.action === "fradePresentation") event.stopImmediatePropagation();
    if (!validRequest(value)) return;
    if (!graph?.container) {
      reply(value, "REFUSED", "Frame graph unavailable");
      return;
    }
    try {
      if (value.operation === "prepare") {
        owner = value;
        ++epoch;
        prepared = { request: value, snapshot: value.snapshot, style: stylesheet(value.snapshot) };
        reply(value, "READY");
      } else if (value.operation === "apply") {
        if (!prepared || !sameOwner(prepared.request.context, value.context) || value.participantGeneration !== prepared.request.participantGeneration) {
          reply(value, "REFUSED", "Unprepared frame presentation owner");
          return;
        }
        owner = value;
        const candidate = prepared;
        prepared = void 0;
        void apply(value, candidate.snapshot, candidate.style).catch((error) => {
          if (!disposed && active?.request === value)
            reply(value, "REFUSED", error instanceof Error ? error.message : String(error));
        });
      } else if (value.operation === "rollback") {
        owner = value;
        prepared = void 0;
        void apply(value, value.snapshot, stylesheet(value.snapshot)).catch((error) => {
          if (!disposed && active?.request === value)
            reply(value, "REFUSED", error instanceof Error ? error.message : String(error));
        });
      } else if (value.operation === "release") {
        if (prepared && sameOwner(prepared.request.context, value.context)) prepared = void 0;
        if (active && sameOwner(active.request.context, value.context)) ++epoch;
      } else if (value.operation === "detach") {
        ++epoch;
        clearProjection();
      }
    } catch (error) {
      reply(value, "REFUSED", error instanceof Error ? error.message : String(error));
    }
  };
  const keydown = (event) => {
    if (upperKey(event) || lowerKey(event)) return;
    if (disposed || !active || event.isComposing || event.keyCode === 229 || event.altKey || event.shiftKey)
      return;
    const target = event.target;
    if (target?.closest?.(
      'input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"]'
    ))
      return;
    const key = event.key.toLowerCase(), now = performance.now();
    let command;
    if ((event.ctrlKey || event.metaKey) && key === "k") {
      chordUntil = now + 1e3;
      command = "k";
    } else if ((event.ctrlKey || event.metaKey) && key === "t" && now < chordUntil) {
      chordUntil = 0;
      command = "t";
    } else if (key === "escape" && now < chordUntil) {
      chordUntil = 0;
      command = "Escape";
    }
    if (!command) return;
    event.preventDefault();
    event.stopPropagation();
    post({
      event: "fradePresentationKey",
      version: 1,
      participantId: active.request.participantId,
      participantGeneration: active.request.participantGeneration,
      context: active.request.context,
      key: command
    });
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ++epoch;
    observer?.disconnect();
    lowerObserver?.disconnect();
    for (const name of ["click", "mousemove", "pointermove"]) document.removeEventListener(name, upperMouse, true);
    for (const name of ["focusin", "focusout", "scroll"]) document.removeEventListener(name, upperFocusChanged, true);
    window.removeEventListener("resize", lowerResize);
    for (const name of ["focus", "blur"]) window.removeEventListener(name, upperFocusChanged);
    for (const query of lowerMedia) query.removeEventListener("change", lowerResize);
    for (const name of ["click", "mousedown", "mouseup", "pointerdown", "pointerup"])
      document.removeEventListener(name, lowerMouse, true);
    graph?.view?.removeListener?.(viewChanged);
    ui?.editor?.removeListener?.(viewChanged);
    graph?.container?.removeEventListener("scroll", viewChanged);
    window.removeEventListener("message", receive);
    document.removeEventListener("keydown", keydown, true);
    window.removeEventListener("pagehide", dispose);
    if (prototype?.init === installedInit) prototype.init = originalInit;
    clearProjection();
  };
  const lowerMedia = typeof window.matchMedia === "function" ? ["(pointer:coarse)", "(forced-colors:active)", "(prefers-reduced-motion:reduce)"].map((query) => window.matchMedia(query)) : [];
  for (const query of lowerMedia) query.addEventListener("change", lowerResize);
  window.addEventListener("resize", lowerResize);
  for (const name of ["focus", "blur"]) window.addEventListener(name, upperFocusChanged);
  for (const name of ["click", "mousedown", "mouseup", "pointerdown", "pointerup"])
    document.addEventListener(name, lowerMouse, true);
  for (const name of ["click", "mousemove", "pointermove"]) document.addEventListener(name, upperMouse, true);
  for (const name of ["focusin", "focusout", "scroll"]) document.addEventListener(name, upperFocusChanged, true);
  window.addEventListener("message", receive);
  document.addEventListener("keydown", keydown, true);
  window.addEventListener("pagehide", dispose);
  return dispose;
}
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
const roles$1 = new Set(presentationRoles);
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
      if (key !== "ignored" && !roles$1.has(role)) invalid();
    }
  }
}
function parsePresentationChoice(value) {
  data(value);
  choice(value);
  return owned(value);
}
function parsePresentationRecord(value) {
  data(value);
  persisted(value);
  return owned(value);
}
function parsePresentationPhase(value) {
  data(value);
  phase(value);
  return owned(value);
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
    case "persist": {
      const payload = fields$1(object.payload, ["context", "selection", "expectedRevision"]);
      phase(payload.context);
      choice(payload.selection);
      integer(payload.expectedRevision);
      const context = payload.context;
      if (context.sessionId !== object.sessionId || context.requestId !== object.requestId || context.phase !== "apply")
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
function parseRequest(v) {
  if (!record$1(v)) throw new RuntimeError("INVALID_REQUEST");
  if (v.protocolVersion !== 1) throw new RuntimeError("VERSION_MISMATCH");
  if (v.operation !== "health.get") throw new RuntimeError("UNKNOWN_OPERATION");
  if (!keys(v, ["type", "protocolVersion", "requestId", "operation", "payload"]) || v.type !== "request" || !validId(v.requestId) || !record$1(v.payload) || Object.keys(v.payload).length)
    throw new RuntimeError("INVALID_REQUEST");
  return v;
}
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
function failure$1(requestId, error) {
  return { type: "response", protocolVersion: 1, requestId, ok: false, error };
}
const builtinTokens = {
  "themes": {
    "light": {
      "surface.base": "#FFFFFF",
      "surface.panel": "#F5F6F8",
      "surface.rail": "#EAEDF1",
      "surface.hover": "#E8EBF0",
      "surface.overlay": "#FFFFFF",
      "text.primary": "#20242B",
      "text.secondary": "#535D6A",
      "text.disabled": "#697386",
      "border.subtle": "#D9DEE6",
      "border.control": "#687386",
      "action.primary": "#245FC7",
      "action.primaryHover": "#1E50AA",
      "action.onPrimary": "#FFFFFF",
      "selection.bg": "#E3EDFF",
      "selection.fg": "#20242B",
      "selection.indicator": "#245FC7",
      "focus.ring": "#245FC7",
      "status.success": "#17603C",
      "status.successBg": "#E7F4EB",
      "status.warning": "#854000",
      "status.warningBg": "#FFF0D7",
      "status.error": "#B42318",
      "status.errorBg": "#FDEDEA",
      "status.info": "#245FC7",
      "status.infoBg": "#E3EDFF",
      "diagram.canvas": "#F9FAFC",
      "diagram.grid": "#D9DEE6",
      "diagram.nodeBg": "#FFFFFF",
      "diagram.nodeStroke": "#687386",
      "diagram.edge": "#586578",
      "diagram.selection": "#245FC7"
    },
    "dark": {
      "surface.base": "#181A1F",
      "surface.panel": "#202329",
      "surface.rail": "#15171B",
      "surface.hover": "#2B3039",
      "surface.overlay": "#272B33",
      "text.primary": "#E6E9EF",
      "text.secondary": "#AAB3C2",
      "text.disabled": "#8792A4",
      "border.subtle": "#373E49",
      "border.control": "#7C889B",
      "action.primary": "#89B4FF",
      "action.primaryHover": "#A7C7FF",
      "action.onPrimary": "#111827",
      "selection.bg": "#283D5E",
      "selection.fg": "#E6E9EF",
      "selection.indicator": "#89B4FF",
      "focus.ring": "#89B4FF",
      "status.success": "#8FD5AE",
      "status.successBg": "#193729",
      "status.warning": "#F3C67A",
      "status.warningBg": "#423116",
      "status.error": "#FFB4AB",
      "status.errorBg": "#492522",
      "status.info": "#89B4FF",
      "status.infoBg": "#283D5E",
      "diagram.canvas": "#1B1E24",
      "diagram.grid": "#363D48",
      "diagram.nodeBg": "#252B35",
      "diagram.nodeStroke": "#7C889B",
      "diagram.edge": "#AAB3C2",
      "diagram.selection": "#89B4FF"
    },
    "high-contrast": {
      "surface.base": "#000000",
      "surface.panel": "#000000",
      "surface.rail": "#000000",
      "surface.hover": "#000000",
      "surface.overlay": "#000000",
      "text.primary": "#FFFFFF",
      "text.secondary": "#FFFFFF",
      "text.disabled": "#FFFFFF",
      "border.subtle": "#FFFFFF",
      "border.control": "#FFFFFF",
      "action.primary": "#FFFF00",
      "action.primaryHover": "#FFFFFF",
      "action.onPrimary": "#000000",
      "selection.bg": "#000000",
      "selection.fg": "#FFFFFF",
      "selection.indicator": "#00FFFF",
      "focus.ring": "#FFFF00",
      "status.success": "#00FF88",
      "status.successBg": "#000000",
      "status.warning": "#FFFF00",
      "status.warningBg": "#000000",
      "status.error": "#FFB4AB",
      "status.errorBg": "#000000",
      "status.info": "#00FFFF",
      "status.infoBg": "#000000",
      "diagram.canvas": "#000000",
      "diagram.grid": "#444444",
      "diagram.nodeBg": "#000000",
      "diagram.nodeStroke": "#FFFFFF",
      "diagram.edge": "#FFFFFF",
      "diagram.selection": "#00FFFF"
    }
  }
};
function freezeOwned(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeOwned(child);
    Object.freeze(value);
  }
  return value;
}
const themeRoles = Object.freeze(
  Object.keys(builtinTokens.themes.light)
);
const surfaces = [
  "surface.base",
  "surface.panel",
  "surface.rail",
  "surface.hover",
  "surface.overlay"
];
const contrastPairs = freezeOwned([
  ...["text.primary", "text.secondary"].flatMap(
    (fg) => surfaces.map((bg) => [fg, bg, 4.5])
  ),
  ["action.onPrimary", "action.primary", 4.5],
  ["action.onPrimary", "action.primaryHover", 4.5],
  ["selection.fg", "selection.bg", 4.5],
  ["text.secondary", "selection.bg", 4.5],
  ["text.primary", "diagram.nodeBg", 4.5],
  ...["success", "warning", "error", "info"].map(
    (status) => ["status." + status, "status." + status + "Bg", 4.5]
  ),
  ...["focus.ring", "border.control"].flatMap(
    (fg) => surfaces.map((bg) => [fg, bg, 3])
  ),
  ["diagram.nodeStroke", "diagram.canvas", 3],
  ["diagram.nodeStroke", "diagram.nodeBg", 3],
  ["diagram.edge", "diagram.canvas", 3],
  ["diagram.selection", "diagram.nodeBg", 3],
  ["focus.ring", "selection.bg", 3]
]);
function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
function contrastRatio(a, b) {
  if (!isHexColor(a) || !isHexColor(b)) throw new Error("Contrast requires HEX6 values");
  const luminance = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function repairContrast(input, builtin, pairs = contrastPairs) {
  const colors = { ...input }, repaired = /* @__PURE__ */ new Set();
  const complete = () => pairs.every(([fg, bg, minimum]) => contrastRatio(colors[fg], colors[bg]) >= minimum);
  const result = (status, passes, value = colors) => freezeOwned({
    colors: { ...value },
    status,
    passes,
    repaired: themeRoles.filter((role) => repaired.has(role))
  });
  if (complete()) return result("VALID", 0);
  for (let pass = 1; pass <= 10; pass++) {
    for (const [fg, bg, minimum] of pairs)
      if (contrastRatio(colors[fg], colors[bg]) < minimum) {
        colors[fg] = builtin[fg];
        colors[bg] = builtin[bg];
        repaired.add(fg);
        repaired.add(bg);
      }
    if (complete()) return result("REPAIRED", pass);
  }
  for (const role of themeRoles) repaired.add(role);
  return result("FALLBACK", 10, builtin);
}
const BUILTIN_IDS = Object.freeze({
  light: "frade.builtin/light",
  dark: "frade.builtin/dark",
  "high-contrast": "frade.builtin/high-contrast"
});
const themeKinds = Object.freeze(["light", "dark", "high-contrast"]);
const labels = {
  light: "Frade Light",
  dark: "Frade Dark",
  "high-contrast": "Frade High Contrast"
};
const roles = new Set(themeRoles);
function isDataRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Object.values(Object.getOwnPropertyDescriptors(value)).every((d) => "value" in d);
}
function issue(code, source, message, role) {
  return role === void 0 ? { code, source, message } : { code, source, message, role };
}
function validateColors(value, source) {
  const colors = {}, issues = [], recognized = [], ignored = [];
  if (!isDataRecord(value))
    return {
      colors,
      issues: [issue("INVALID_COLORS", source, "Colors must be a plain data record")],
      recognized,
      ignored
    };
  for (const role of themeRoles)
    if (Object.hasOwn(value, role)) {
      if (isHexColor(value[role])) {
        colors[role] = value[role];
        recognized.push(role);
      } else {
        issues.push(issue("INVALID_COLOR", source, "Known roles require HEX6 values", role));
        ignored.push(role);
      }
    }
  for (const role of Object.keys(value).filter((key) => !roles.has(key)).sort()) {
    issues.push(issue("UNKNOWN_ROLE", source, "Unregistered role ignored", role));
    ignored.push(role);
  }
  return { colors, issues, recognized, ignored };
}
function createThemeRegistry(descriptors = []) {
  const entries = /* @__PURE__ */ new Map(), issues = [];
  for (const kind of themeKinds)
    entries.set(
      BUILTIN_IDS[kind],
      freezeOwned({
        id: BUILTIN_IDS[kind],
        label: labels[kind],
        kind,
        enabled: true,
        builtin: true,
        colors: { ...builtinTokens.themes[kind] },
        issues: []
      })
    );
  for (const [index, descriptor] of descriptors.entries()) {
    const source = "descriptor[" + index + "]";
    if (!isDataRecord(descriptor)) {
      issues.push(issue("INVALID_DESCRIPTOR", source, "Theme must be a plain data record"));
      continue;
    }
    if (typeof descriptor.id === "string" && descriptor.id.startsWith("frade.builtin/")) {
      issues.push(issue("RESERVED_ID", source, "Builtin identity cannot be replaced"));
      continue;
    }
    if (typeof descriptor.id !== "string" || descriptor.id.length > 160 || !/^[a-z0-9][a-z0-9.-]*\.[a-z0-9][a-z0-9.-]*[/][a-z0-9][a-z0-9._-]*$/i.test(descriptor.id) || typeof descriptor.label !== "string" || descriptor.label.length < 1 || descriptor.label.length > 160 || [...descriptor.label].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    ) || !themeKinds.includes(descriptor.kind) || descriptor.enabled !== void 0 && typeof descriptor.enabled !== "boolean" || Object.keys(descriptor).some(
      (key) => !["id", "label", "kind", "enabled", "colors"].includes(key)
    ) || !isDataRecord(descriptor.colors)) {
      issues.push(
        issue("INVALID_DESCRIPTOR", source, "Invalid theme identity, kind, label or data fields")
      );
      continue;
    }
    if (entries.has(descriptor.id)) {
      issues.push(issue("DUPLICATE_ID", source, "First registered stable identity wins"));
      continue;
    }
    const validated = validateColors(descriptor.colors, descriptor.id);
    issues.push(...validated.issues);
    entries.set(
      descriptor.id,
      freezeOwned({
        id: descriptor.id,
        label: descriptor.label,
        kind: descriptor.kind,
        enabled: descriptor.enabled !== false,
        builtin: false,
        colors: validated.colors,
        issues: validated.issues
      })
    );
  }
  const list = freezeOwned([...entries.values()]), diagnostics = freezeOwned(issues);
  return Object.freeze({
    issues: diagnostics,
    get: (id) => entries.get(id),
    list: () => list
  });
}
function resolveTheme(input) {
  const issues = input.registry.issues.map((item) => ({ ...item }));
  const requested = input.selection?.mode ?? "system";
  const mode = requested === "system" || themeKinds.includes(requested) ? requested : "system";
  if (mode !== requested)
    issues.push(issue("INVALID_MODE", "selection", "Invalid mode falls back to System"));
  const kind = mode === "system" ? input.environment?.highContrast ? "high-contrast" : input.environment?.colorScheme === "dark" ? "dark" : "light" : mode;
  const requestedDensity = input.selection?.density ?? "compact";
  const density = requestedDensity === "comfortable" ? "comfortable" : "compact";
  if (density !== requestedDensity)
    issues.push(issue("INVALID_DENSITY", "selection", "Invalid density falls back to compact"));
  const preferred = input.selection?.preferred?.[kind] ?? BUILTIN_IDS[kind];
  let selected = input.registry.get(preferred);
  if (!selected || !selected.enabled || selected.kind !== kind) {
    issues.push(
      issue(
        !selected ? "UNKNOWN_THEME" : !selected.enabled ? "DISABLED_THEME" : "KIND_MISMATCH",
        "selection",
        "Selection falls back to the matching builtin"
      )
    );
    selected = input.registry.get(BUILTIN_IDS[kind]);
  }
  if (!selected) throw new Error("Theme registry must contain all reserved builtins");
  const builtin = builtinTokens.themes[kind];
  const colors = { ...builtin, ...selected.colors }, recognized = /* @__PURE__ */ new Set(), ignored = /* @__PURE__ */ new Set();
  for (const role of themeRoles) if (Object.hasOwn(selected.colors, role)) recognized.add(role);
  for (const diagnostic of selected.issues) if (diagnostic.role) ignored.add(diagnostic.role);
  const apply = (layer, source) => {
    if (layer === void 0) return;
    const validated = validateColors(layer, source);
    Object.assign(colors, validated.colors);
    issues.push(...validated.issues);
    for (const role of validated.recognized) recognized.add(role);
    for (const role of validated.ignored) ignored.add(role);
  };
  apply(input.overrides?.global, "user.global");
  apply(input.overrides?.byTheme?.[selected.id], "user.theme." + selected.id);
  if (input.overrides?.workspaceEnabled === true) apply(input.overrides.workspace, "workspace");
  const repaired = repairContrast(colors, builtin);
  if (repaired.status !== "VALID")
    issues.push(
      issue(
        "CONTRAST_" + repaired.status,
        selected.id,
        repaired.status === "REPAIRED" ? "Violating role pairs restored from builtin palette" : "Ten-pass bound reached; complete builtin palette restored"
      )
    );
  const forcedColors = input.environment?.forcedColors === true;
  const effectiveColors = { ...repaired.colors };
  if (forcedColors) {
    for (const role of themeRoles)
      effectiveColors[role] = role.startsWith("surface.") || role.endsWith("Bg") || role === "diagram.canvas" ? "Canvas" : "CanvasText";
    for (const role of [
      "action.primary",
      "action.primaryHover",
      "selection.bg",
      "selection.indicator",
      "focus.ring",
      "diagram.selection"
    ])
      effectiveColors[role] = "Highlight";
    for (const role of ["action.onPrimary", "selection.fg"])
      effectiveColors[role] = "HighlightText";
  }
  return freezeOwned({
    id: selected.id,
    label: selected.label,
    kind,
    density,
    revision: Number.isSafeInteger(input.revision) && (input.revision ?? -1) >= 0 ? input.revision : 0,
    colors: { ...repaired.colors },
    effectiveColors,
    forcedColors,
    status: repaired.status,
    repairPasses: repaired.passes,
    issues,
    compatibility: {
      recognized: themeRoles.filter((role) => recognized.has(role)),
      ignored: [...ignored].sort(),
      repaired: [...repaired.repaired]
    }
  });
}
function trustedPage(url, devUrl2) {
  try {
    const u = new URL(url);
    if (u.username || u.password) return false;
    if (devUrl2) {
      const d = new URL(devUrl2);
      return u.origin === d.origin && ["/", "/index.html"].includes(u.pathname) && ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname) && u.protocol === "http:";
    }
    return u.protocol === "frade:" && u.host === "app" && u.pathname === "/index.html" && !u.search;
  } catch {
    return false;
  }
}
function authorizedSender(senderId, mainFrame, url, windowId, devUrl2) {
  return senderId === windowId && mainFrame && trustedPage(url, devUrl2);
}
async function resourcePath(root, url) {
  const u = new URL(url);
  if (u.protocol !== "frade:" || u.host !== "app" || u.username || u.password || u.search)
    throw new Error("FORBIDDEN");
  const pathname = decodeURIComponent(u.pathname);
  if (pathname.includes("\\") || pathname.includes("\0")) throw new Error("FORBIDDEN");
  const base = await promises.realpath(root);
  const path = await promises.realpath(node_path.resolve(base, "." + pathname));
  const rel = node_path.relative(base, path);
  if (!rel || rel === ".." || rel.startsWith(".." + (process.platform === "win32" ? "\\" : "/")) || node_path.isAbsolute(rel))
    throw new Error("FORBIDDEN");
  return path;
}
const productionCsp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src frade://drawio; form-action 'none'";
const errorText = (error) => (error instanceof Error ? error.message : String(error)).slice(0, 480);
const missing = (error) => !!error && typeof error === "object" && error.code === "ENOENT";
function defaultFiles() {
  return {
    read: async (path) => {
      try {
        const info = await promises.lstat(path);
        if (!info.isFile() || info.isSymbolicLink() || info.size > PRESENTATION_MAX_BYTES)
          throw Error("Invalid bounded presentation settings file");
        const contents = await promises.readFile(path, "utf8");
        if (Buffer.byteLength(contents, "utf8") > PRESENTATION_MAX_BYTES)
          throw Error("Oversized presentation settings file");
        return contents;
      } catch (error) {
        if (missing(error)) return void 0;
        throw error;
      }
    },
    stage: async (path, contents) => {
      await promises.mkdir(node_path.dirname(path), { recursive: true });
      const file = await promises.open(path, "wx", 384);
      try {
        await file.writeFile(contents, "utf8");
        await file.sync();
      } finally {
        await file.close();
      }
    },
    rename: async (staged, target) => {
      await promises.rename(staged, target);
    },
    remove: async (path) => {
      try {
        const info = await promises.lstat(path);
        if (info.isSymbolicLink() || !info.isFile()) throw Error("Unsafe presentation staged file");
        await promises.unlink(path);
      } catch (error) {
        if (!missing(error)) throw error;
      }
    }
  };
}
function sameSelection(a, b) {
  return a.mode === b.mode && a.density === b.density && a.preferred.light === b.preferred.light && a.preferred.dark === b.preferred.dark && a.preferred["high-contrast"] === b.preferred["high-contrast"];
}
function sameRecord(a, b) {
  return a.version === b.version && a.revision === b.revision && a.generation === b.generation && a.transactionId === b.transactionId && sameSelection(a.selection, b.selection);
}
function createPresentationSettings(options) {
  if (!node_path.isAbsolute(options.userData)) throw Error("Presentation userData must be absolute");
  const root = node_path.resolve(options.userData), target = node_path.join(root, "presentation-settings.json"), staged = node_path.join(root, "presentation-settings.json.staged"), files = options.files ?? defaultFiles();
  const defaults = parsePresentationRecord({
    version: 1,
    revision: 0,
    generation: 0,
    transactionId: "boot",
    selection: { mode: "system", density: "compact", preferred: { ...BUILTIN_IDS } }
  });
  let authoritative = defaults, origin, originProven = false, boot, initialization;
  let acceptedGeneration = 0, activeRequest = "", tail = Promise.resolve(), maximumRevision = 0;
  const known = /* @__PURE__ */ new Map(), candidates = /* @__PURE__ */ new Map();
  const remember = (map, value) => {
    map.set(value.revision, value);
    maximumRevision = Math.max(maximumRevision, value.revision);
    while (map.size > 64) map.delete(map.keys().next().value);
  };
  const authorize = (sender) => {
    if (!authorizedSender(
      sender.senderId,
      sender.mainFrame,
      sender.url,
      options.windowId,
      options.devUrl
    ))
      throw Error("UNAUTHORIZED");
  };
  const queue = (operation) => {
    const result = tail.then(operation, operation);
    tail = result;
    return result;
  };
  const requireInitialized = () => {
    if (!boot) throw Error("Presentation bootstrap unavailable");
  };
  const cachedBoot = (diagnostics) => {
    const snapshot2 = resolveTheme({
      registry: createThemeRegistry(),
      selection: authoritative.selection,
      environment: options.environment,
      revision: authoritative.revision
    });
    return parsePresentationBoot({
      version: 1,
      sessionId: options.sessionId,
      bootRevision: snapshot2.revision,
      snapshot: snapshot2,
      durable: authoritative,
      diagnostics
    });
  };
  const current = (context) => context.sessionId === options.sessionId && context.generation === acceptedGeneration && context.requestId === activeRequest && context.transactionId === activeRequest;
  async function readAuthoritative() {
    const raw = await files.read(target);
    if (originProven && raw === origin && authoritative.revision === defaults.revision && known.has(defaults.revision))
      return known.get(defaults.revision);
    if (raw === void 0) throw Error("Authoritative settings absence cannot be reconciled");
    const value = parsePresentationRecord(JSON.parse(raw));
    const expected = known.get(value.revision) ?? candidates.get(value.revision);
    if (!expected || !sameRecord(expected, value))
      throw Error("Unowned authoritative settings revision");
    return value;
  }
  async function write(context, selection, base, onRename) {
    if (!current(context)) throw Error("Stale presentation intent");
    const record2 = parsePresentationRecord({
      version: 1,
      revision: Math.max(base.revision, maximumRevision) + 1,
      generation: context.generation,
      transactionId: context.transactionId,
      selection
    });
    remember(candidates, record2);
    await files.stage(staged, JSON.stringify(record2) + "\n");
    if (!current(context)) throw Error("Stale presentation intent before rename");
    onRename?.();
    await files.rename(staged, target);
    const raw = await files.read(target);
    if (raw === void 0) throw Error("Missing authoritative rename readback");
    const readback = parsePresentationRecord(JSON.parse(raw));
    if (!sameRecord(record2, readback)) throw Error("Authoritative rename readback mismatch");
    if (!current(context)) throw Error("Stale presentation intent after rename");
    remember(known, readback);
    authoritative = readback;
    return readback;
  }
  const store = {
    initialize: () => {
      if (initialization) return initialization;
      initialization = (async () => {
        const diagnostics = [];
        try {
          origin = await files.read(target);
          originProven = true;
          if (origin !== void 0) authoritative = parsePresentationRecord(JSON.parse(origin));
        } catch (error) {
          diagnostics.push("Presentation startup fallback: " + errorText(error));
          authoritative = defaults;
        }
        remember(known, authoritative);
        acceptedGeneration = authoritative.generation;
        try {
          await files.remove(staged);
        } catch (error) {
          diagnostics.push("Presentation staging recovery: " + errorText(error));
        }
        boot = cachedBoot(diagnostics);
        return boot;
      })();
      return initialization;
    },
    bootstrap: (sender) => {
      authorize(sender);
      requireInitialized();
      boot = cachedBoot(boot.diagnostics);
      return parsePresentationBoot(boot);
    },
    announceIntent: async (requestId) => {
      requireInitialized();
      parsePresentationRequest({
        version: 1,
        sessionId: options.sessionId,
        requestId,
        operation: "intent",
        payload: {}
      });
      if (activeRequest === requestId) throw Error("Replayed presentation intent");
      if (!Number.isSafeInteger(acceptedGeneration + 1)) throw Error("Presentation intent limit");
      activeRequest = requestId;
      return Object.freeze({ generation: ++acceptedGeneration });
    },
    persist: (context, selection, expectedRevision) => {
      requireInitialized();
      const phase2 = parsePresentationPhase(context), choice2 = parsePresentationChoice(selection);
      if (phase2.phase !== "apply" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
        return Promise.resolve({
          status: "REFUSED",
          message: "Invalid persistence phase or revision"
        });
      return queue(async () => {
        if (!current(phase2) || expectedRevision !== authoritative.revision)
          return { status: "REFUSED", message: "Stale intent/CAS refused" };
        let renameAttempted = false;
        let outcome;
        try {
          const base = await readAuthoritative();
          if (!current(phase2) || base.revision !== expectedRevision)
            outcome = { status: "REFUSED", message: "Authoritative CAS refused" };
          else {
            const durable = await write(phase2, choice2, base, () => {
              renameAttempted = true;
            });
            outcome = { status: "ACK", durable };
          }
        } catch (error) {
          outcome = { status: renameAttempted ? "UNKNOWN" : "REFUSED", message: errorText(error) };
        }
        try {
          await files.remove(staged);
        } catch (error) {
          return {
            status: "UNKNOWN",
            message: "Staging cleanup outcome unknown: " + errorText(error)
          };
        }
        return outcome;
      });
    },
    reconcile: (context, lastPublished) => {
      requireInitialized();
      const phase2 = parsePresentationPhase(context), published = parsePresentationRecord(lastPublished), expected = known.get(published.revision);
      if (phase2.phase !== "rollback" || !expected || !sameRecord(published, expected))
        return Promise.reject(Error("Forged published settings revision"));
      return queue(async () => {
        if (!current(phase2)) throw Error("Stale compensation owner");
        const actual = await readAuthoritative();
        if (!current(phase2)) throw Error("Stale compensation owner after readback");
        if (sameSelection(actual.selection, published.selection)) {
          remember(known, actual);
          authoritative = actual;
          return actual;
        }
        try {
          return await write(phase2, published.selection, actual);
        } finally {
          await files.remove(staged);
        }
      });
    },
    request: async (sender, input) => {
      authorize(sender);
      requireInitialized();
      const request = parsePresentationRequest(input);
      if (request.sessionId !== options.sessionId) throw Error("UNAUTHORIZED_SESSION");
      switch (request.operation) {
        case "intent":
          return store.announceIntent(request.requestId);
        case "persist":
          return store.persist(
            request.payload.context,
            request.payload.selection,
            request.payload.expectedRevision
          );
        case "reconcile":
          return store.reconcile(request.payload.context, request.payload.lastPublished);
        case "ready":
          if (request.payload.bootRevision !== boot.bootRevision || request.payload.rootRevision !== boot.snapshot.revision)
            throw Error("STALE_PRESENTATION_READY");
          options.onReady?.(request.payload.bootRevision, request.payload.rootRevision);
          return { version: 1, ready: true };
      }
    }
  };
  return store;
}
function createPresentationVisibility(boot, show, failure2) {
  let native = false, presentation = false, closed = false, shown = false;
  const timer = setTimeout(() => {
    if (!shown && !closed) {
      closed = true;
      failure2("Presentation bootstrap handshake timeout (5000ms)");
    }
  }, 5e3);
  const reveal = () => {
    if (native && presentation && !closed && !shown) {
      shown = true;
      clearTimeout(timer);
      show();
    }
  };
  return {
    nativeReady: () => {
      native = true;
      reveal();
    },
    presentationReady: (bootRevision, rootRevision) => {
      if (bootRevision !== boot.bootRevision || rootRevision !== boot.snapshot.revision) return;
      presentation = true;
      reveal();
    },
    dispose: () => {
      closed = true;
      clearTimeout(timer);
    }
  };
}
const success = (value) => ({ ok: true, value });
const failure = (code, issues = [], operationId) => ({
  ok: false,
  error: {
    code,
    message: code,
    retriable: ["REPOSITORY_UNAVAILABLE", "INDEX_OUT_OF_SYNC"].includes(code),
    issues,
    ...operationId === void 0 ? {} : { operationId }
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
async function atomicJson(target, value) {
  const stage = target + "." + node_crypto.randomUUID() + ".tmp";
  try {
    const handle = await promises.open(stage, "wx");
    try {
      await handle.writeFile(JSON.stringify(value, null, 2));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await promises.rename(stage, target);
  } finally {
    await promises.unlink(stage).catch(() => {
    });
  }
}
class WorkbenchRelay {
  constructor(event) {
    this.event = event;
  }
  child;
  epoch = 0;
  pending = /* @__PURE__ */ new Map();
  attach(child) {
    this.failed();
    this.child = child;
    const epoch = ++this.epoch;
    child.on("message", (message) => {
      if (this.child !== child || epoch !== this.epoch || !message || typeof message !== "object")
        return;
      const m = message;
      if (m.type === "workbench-event") {
        const decoded = decodeWorkbenchEvent(m.value);
        if (decoded.ok) this.event(decoded.value);
        return;
      }
      if (m.type !== "workbench-response" || typeof m.id !== "string") return;
      const entry = this.pending.get(m.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(m.id);
      entry.finish(decodeWorkbenchResult(m.result));
    });
    child.on("exit", () => {
      if (this.child === child) this.failed();
    });
  }
  failed() {
    this.child = void 0;
    this.epoch++;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.finish(
        failure(p.mutation ? "OUTCOME_UNKNOWN" : "REPOSITORY_UNAVAILABLE", [], p.operationId)
      );
    }
    this.pending.clear();
  }
  request(command) {
    const child = this.child;
    if (!child) return Promise.resolve(failure("REPOSITORY_UNAVAILABLE"));
    const id = node_crypto.randomUUID(), mutation = command.operation === "request" && (command.value.request.operation === "applyChanges" || command.value.request.operation === "diagram" && !["list", "read", "catalogs"].includes(String(command.value.request.payload.action)));
    const operationId = mutation ? String(
      command.value.request.payload.changeSet && command.value.request.payload.changeSet.idempotencyKey
    ) : void 0;
    return new Promise((resolve2) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve2(failure(mutation ? "OUTCOME_UNKNOWN" : "CANCELLED", [], operationId));
        try {
          child.postMessage({ type: "workbench-cancel", id });
        } catch {
        }
      }, 3e4);
      this.pending.set(id, { finish: resolve2, timer, mutation, operationId });
      try {
        child.postMessage({ type: "workbench-request", id, command });
      } catch {
        clearTimeout(timer);
        this.pending.delete(id);
        resolve2(failure(mutation ? "OUTCOME_UNKNOWN" : "REPOSITORY_UNAVAILABLE", [], operationId));
      }
    });
  }
}
async function requiredEntry(folder, entry, role) {
  const label = role === "data" ? "Папка данных репозитория" : "Папка метаописания";
  const hint = role === "data" ? "Выберите папку с root.yaml (для KA — папку KA)." : "Выберите папку со схемами (для KA — _ecosystems_).";
  try {
    if ((await promises.stat(node_path.resolve(folder, entry))).isFile()) return success(true);
  } catch (error) {
    const code = error.code;
    if (code !== "ENOENT" && code !== "ENOTDIR")
      return failure("ACCESS_DENIED", [
        {
          code: "PATH_UNAVAILABLE",
          path: [role],
          message: label + ": " + folder + ". Не удалось прочитать " + entry + " (" + code + ")."
        }
      ]);
  }
  return failure("PROFILE_INVALID", [
    {
      code: "ENTRY_NOT_FOUND",
      path: [role],
      message: label + ": " + folder + ". Не найден файл " + entry + ". " + hint
    }
  ]);
}
async function validatePaths(root) {
  if (root.adapterKind !== "sberea") return success(true);
  const data2 = await requiredEntry(root.dataRoot, root.entry, "data");
  if (!data2.ok) return data2;
  const set = root.metadataSets.find((item) => item.id === root.activeMetadataSet);
  if (!set) return failure("PROFILE_INVALID");
  for (const entry of set.schemaEntries) {
    const result = await requiredEntry(set.folderPath, entry, "metadata");
    if (!result.ok) return result;
  }
  return success(true);
}
const describeFailure = (result) => [result.error.code, ...result.error.issues.map((issue2) => issue2.message)].join("\n");
class WorkbenchHost {
  constructor(options) {
    this.options = options;
  }
  roots = [];
  file;
  observed = /* @__PURE__ */ new Map();
  candidates = /* @__PURE__ */ new Map();
  tail = Promise.resolve();
  observe(event) {
    const session = this.roots.find(
      (r) => r.root.repositoryId === event.scope.repositoryId
    )?.session;
    if (!session || session.sessionId !== event.scope.sessionId || session.generation !== event.scope.generation)
      return;
    const previous = this.observed.get(event.scope.repositoryId);
    if (previous?.scope.sessionId === event.scope.sessionId && previous.event.sequence >= event.event.sequence)
      return;
    this.observed.set(event.scope.repositoryId, event);
  }
  status(focusRoot) {
    return {
      ...focusRoot ? { focusRoot } : {},
      roots: structuredClone(
        this.roots.map((root) => {
          const observed = this.observed.get(root.root.repositoryId);
          if (!root.session || !observed || observed.scope.sessionId !== root.session.sessionId || observed.scope.generation !== root.session.generation)
            return root;
          return {
            ...root,
            session: {
              ...root.session,
              ...observed.scope,
              ...observed.event.state ? { state: observed.event.state } : {}
            }
          };
        })
      ),
      ...this.file ? { file: this.file } : {}
    };
  }
  async persist(roots = this.roots, file = this.file) {
    const target = this.options.settingsFile;
    await promises.mkdir(node_path.dirname(target), { recursive: true });
    await atomicJson(target, {
      version: 1,
      roots: roots.map((r) => r.root),
      ...file ? { workspaceFile: file } : {}
    });
  }
  async open(root) {
    root = { ...root, dataRoot: await promises.realpath(root.dataRoot).catch(() => root.dataRoot) };
    const paths = await validatePaths(root);
    const result = paths.ok ? await this.options.request({ operation: "open", root }) : paths;
    return result.ok ? { root, session: result.value } : { root, error: describeFailure(result) };
  }
  async request(value) {
    const decoded = decodeScopedRequest(value);
    if (!decoded.ok) return decoded;
    if (!this.roots.some((r) => r.root.repositoryId === decoded.value.scope.repositoryId))
      return failure("ACCESS_DENIED");
    if (decoded.value.request.operation === "diagram" && decoded.value.request.payload.action === "catalogs") {
      const item = this.status().roots.find(
        (r) => r.root.repositoryId === decoded.value.scope.repositoryId
      );
      if (!item?.session || item.session.sessionId !== decoded.value.scope.sessionId || item.session.generation !== decoded.value.scope.generation || item.session.modelGeneration !== decoded.value.scope.modelGeneration)
        return failure("SESSION_CLOSED");
      const catalogs = [], errors = [];
      for (const ref of item.root.externalCatalogs ?? []) {
        try {
          const catalog = await readCatalog(ref.path);
          if (catalog.id !== ref.id) throw Error("Изменился идентификатор источника");
          catalogs.push(catalog);
        } catch (e) {
          errors.push(ref.id + ": " + String(e));
        }
      }
      return success({ catalogs, errors });
    }
    return this.options.request({ operation: "request", value: decoded.value });
  }
  command(input) {
    const decoded = decodeHostCommand(input);
    if (!decoded.ok) return Promise.resolve(decoded);
    const run = () => this.execute(decoded.value).catch(() => failure("REPOSITORY_UNAVAILABLE"));
    const result = this.tail.then(run, run);
    this.tail = result;
    return result;
  }
  async execute(command) {
    switch (command.operation) {
      case "connectCatalog": {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId);
        if (!entry) return failure("ACCESS_DENIED");
        const selected = await this.options.pick("catalog");
        if (!selected) return failure("CANCELLED");
        const path = await promises.realpath(selected), catalog = await readCatalog(path);
        const refs = entry.root.externalCatalogs ?? [];
        if (refs.some((c) => c.id === catalog.id && c.path !== path))
          return failure("INVALID_INPUT");
        const next = this.roots.map(
          (r) => r === entry ? {
            ...r,
            root: {
              ...r.root,
              externalCatalogs: [
                ...refs.filter((c) => c.id !== catalog.id),
                { id: catalog.id, path }
              ]
            }
          } : r
        );
        await this.persist(next);
        this.roots = next;
        return success(this.status());
      }
      case "disconnectCatalog": {
        const next = this.roots.map(
          (r) => r.root.repositoryId === command.repositoryId ? {
            ...r,
            root: {
              ...r.root,
              externalCatalogs: (r.root.externalCatalogs ?? []).filter(
                (c) => c.id !== command.sourceId
              )
            }
          } : r
        );
        await this.persist(next);
        this.roots = next;
        return success(this.status());
      }
      case "add": {
        if (!["sberea", "native"].includes(command.adapterKind))
          return failure("UNSUPPORTED_CAPABILITY");
        const selected = await this.options.pick("data");
        if (!selected) return failure("CANCELLED");
        const dataRoot = await promises.realpath(selected);
        const duplicate = this.roots.find(
          (r) => r.root.dataRoot.toLowerCase() === dataRoot.toLowerCase()
        );
        if (duplicate) return success(this.status(duplicate.root.repositoryId));
        if (command.adapterKind === "sberea") {
          const data2 = await requiredEntry(dataRoot, "root.yaml", "data");
          if (!data2.ok) return data2;
        }
        const folder = command.adapterKind === "sberea" ? await this.options.pick("metadata") : void 0;
        if (command.adapterKind === "sberea" && !folder) return failure("CANCELLED");
        const root = {
          repositoryId: node_crypto.randomUUID(),
          label: dataRoot.split(/[\\/]/).at(-1) ?? "Repository",
          adapterKind: command.adapterKind,
          dataRoot,
          entry: "root.yaml",
          metadataSets: folder ? [
            {
              id: "v2025",
              label: "КАДЗО v2025 + tech_params",
              folderPath: await promises.realpath(folder),
              dialect: "sberea",
              schemaEntries: [
                "kadzo/v2025/entities/root.yaml",
                "kadzo/v2023/entities/technical/tech_params.yaml"
              ],
              documentEntries: [
                "docs/metamodel/kadzo-app.md",
                "docs/metamodel/kadzo-ba.md",
                "docs/metamodel/kadzo-da.md",
                "docs/metamodel/kadzo-change.md"
              ]
            }
          ] : [],
          activeMetadataSet: folder ? "v2025" : ""
        };
        const paths = await validatePaths(root);
        if (!paths.ok) return paths;
        const opened = await this.open(root);
        this.roots.push(opened);
        await this.persist();
        return success(this.status(root.repositoryId));
      }
      case "restore": {
        if (this.roots.length) return success(this.status());
        try {
          const value = JSON.parse(await promises.readFile(this.options.settingsFile, "utf8")), decoded = decodeWorkspace({ version: value.version, roots: value.roots });
          if (!decoded.ok) return decoded;
          this.file = typeof value.workspaceFile === "string" ? value.workspaceFile : void 0;
          for (const root of decoded.value.roots) this.roots.push(await this.open(root));
        } catch (e) {
          if (e.code !== "ENOENT") return failure("PROFILE_INVALID");
        }
        return success(this.status());
      }
      case "retry": {
        const i = this.roots.findIndex((r) => r.root.repositoryId === command.repositoryId);
        if (i < 0) return failure("ACCESS_DENIED");
        this.roots[i] = await this.open(this.roots[i].root);
        return success(this.status());
      }
      case "remove": {
        const found = this.roots.find((r) => r.root.repositoryId === command.repositoryId);
        if (!found) return failure("ACCESS_DENIED");
        const next = this.roots.filter((r) => r !== found);
        await this.persist(next);
        await this.options.request({ operation: "close", repositoryId: command.repositoryId });
        this.roots = next;
        return success(this.status());
      }
      case "reorder": {
        if (command.repositoryIds.length !== this.roots.length || command.repositoryIds.some((id) => !this.roots.some((r) => r.root.repositoryId === id)))
          return failure("INVALID_INPUT");
        const next = command.repositoryIds.map(
          (id) => this.roots.find((r) => r.root.repositoryId === id)
        );
        await this.persist(next);
        this.roots = next;
        return success(this.status());
      }
      case "rename": {
        const next = this.roots.map(
          (r) => r.root.repositoryId === command.repositoryId ? { ...r, root: { ...r.root, label: command.label } } : r
        );
        await this.persist(next);
        this.roots = next;
        return success(this.status());
      }
      case "saveWorkspace": {
        const selected = await this.options.save();
        if (!selected) return failure("CANCELLED");
        const roots = this.roots.map(({ root }) => ({
          ...root,
          dataRoot: node_path.relative(node_path.dirname(selected), root.dataRoot) || ".",
          ...root.externalCatalogs ? {
            externalCatalogs: root.externalCatalogs.map((c) => ({
              ...c,
              path: node_path.relative(node_path.dirname(selected), c.path)
            }))
          } : {},
          metadataSets: root.metadataSets.map((s) => ({
            ...s,
            folderPath: node_path.relative(node_path.dirname(selected), s.folderPath) || "."
          }))
        }));
        await atomicJson(selected, { version: 1, roots });
        this.file = selected;
        await this.persist();
        return success(this.status());
      }
      case "openWorkspace": {
        const file = await this.options.pick("workspace");
        if (!file) return failure("CANCELLED");
        const decoded = decodeWorkspace(JSON.parse(await promises.readFile(file, "utf8")));
        if (!decoded.ok) return decoded;
        const roots = decoded.value.roots.map((root) => ({
          ...root,
          dataRoot: node_path.resolve(node_path.dirname(file), root.dataRoot),
          ...root.externalCatalogs ? {
            externalCatalogs: root.externalCatalogs.map((c) => ({
              ...c,
              path: node_path.resolve(node_path.dirname(file), c.path)
            }))
          } : {},
          metadataSets: root.metadataSets.map((s) => ({
            ...s,
            folderPath: node_path.resolve(node_path.dirname(file), s.folderPath)
          }))
        }));
        for (const old of this.roots)
          await this.options.request({ operation: "close", repositoryId: old.root.repositoryId });
        this.roots = [];
        this.file = file;
        for (const root of roots) this.roots.push(await this.open(root));
        await this.persist();
        return success(this.status());
      }
      case "browseMetadata": {
        if (!this.roots.some((r) => r.root.repositoryId === command.repositoryId))
          return failure("ACCESS_DENIED");
        const path = await this.options.pick("metadata");
        return path ? success(await promises.realpath(path)) : failure("CANCELLED");
      }
      case "stageMetadata": {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId);
        if (!entry) return failure("ACCESS_DENIED");
        const selectedFolder = node_path.resolve(
          this.file ? node_path.dirname(this.file) : entry.root.dataRoot,
          command.metadataSet.folderPath
        );
        for (const schema of command.metadataSet.schemaEntries) {
          const valid = await requiredEntry(selectedFolder, schema, "metadata");
          if (!valid.ok) return valid;
        }
        const folderPath = await promises.realpath(selectedFolder);
        const metadataSet = { ...command.metadataSet, folderPath };
        const result = await this.options.request({
          operation: "stage",
          repositoryId: command.repositoryId,
          metadataSet,
          root: entry.root
        });
        if (!result.ok) return result;
        const root = {
          ...entry.root,
          metadataSets: [
            ...entry.root.metadataSets.filter((s) => s.id !== metadataSet.id),
            metadataSet
          ],
          activeMetadataSet: metadataSet.id
        };
        this.candidates.set(command.repositoryId, {
          preview: result.value,
          root
        });
        return result;
      }
      case "recoveryPreview": {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId);
        if (!entry || entry.root.adapterKind !== "sberea") return failure("ACCESS_DENIED");
        return this.options.request({ operation: "recoveryPreview", dataRoot: entry.root.dataRoot });
      }
      case "recoveryResolve": {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId);
        if (!entry || entry.root.adapterKind !== "sberea") return failure("ACCESS_DENIED");
        const resolved = await this.options.request({
          operation: "recoveryResolve",
          dataRoot: entry.root.dataRoot,
          journalHash: command.journalHash,
          sourceHash: command.sourceHash
        });
        if (!resolved.ok) return resolved;
        this.roots = this.roots.map((r) => r === entry ? { root: r.root } : r);
        return this.execute({ operation: "retry", repositoryId: command.repositoryId });
      }
      case "removeMetadataSet": {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId);
        if (!entry) return failure("ACCESS_DENIED");
        if (entry.root.activeMetadataSet === command.metadataSetId) return failure("INVALID_INPUT");
        const next = this.roots.map(
          (r) => r === entry ? {
            ...r,
            root: {
              ...r.root,
              metadataSets: r.root.metadataSets.filter((s) => s.id !== command.metadataSetId)
            }
          } : r
        );
        await this.persist(next);
        this.roots = next;
        return success(this.status());
      }
      case "cancelMetadata": {
        if (!this.roots.some((r) => r.root.repositoryId === command.repositoryId))
          return failure("ACCESS_DENIED");
        this.candidates.delete(command.repositoryId);
        return this.options.request({
          operation: "cancelCandidate",
          repositoryId: command.repositoryId
        });
      }
      case "activateMetadata": {
        const candidate = this.candidates.get(command.repositoryId), entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId);
        if (!entry || !candidate || candidate.preview.candidateId !== command.candidateId)
          return failure("REVISION_CONFLICT");
        const next = this.roots.map((r) => r === entry ? { ...r, root: candidate.root } : r);
        await this.persist(next);
        const activated = await this.options.request({
          operation: "activate",
          repositoryId: command.repositoryId,
          candidateId: command.candidateId
        });
        if (!activated.ok) {
          try {
            await this.persist();
          } catch {
            await this.options.request({ operation: "close", repositoryId: command.repositoryId });
            this.roots = this.roots.map(
              (r) => r === entry ? {
                root: r.root,
                error: "Не удалось восстановить настройки. Требуется повторное открытие."
              } : r
            );
          }
          return activated;
        }
        this.roots = next.map(
          (r) => r.root.repositoryId === command.repositoryId ? { root: r.root, session: activated.value } : r
        );
        this.candidates.delete(command.repositoryId);
        return success(this.status());
      }
      case "approveClose":
        this.options.close();
        return success(true);
      default:
        return failure("UNSUPPORTED_CAPABILITY");
    }
  }
}
async function readCatalog(path) {
  if ((await promises.stat(path)).size > 1024 * 1024) throw Error("Каталог превышает 1 МБ");
  const value = JSON.parse(await promises.readFile(path, "utf8"));
  if (!value || value.version !== 1 || typeof value.id !== "string" || !value.id.trim() || typeof value.label !== "string" || !Array.isArray(value.objects) || value.objects.length > 5e3)
    throw Error("Некорректное описание внешнего каталога");
  const ids = /* @__PURE__ */ new Set();
  for (const object of value.objects) {
    if (!object || typeof object.id !== "string" || !object.id.trim() || typeof object.name !== "string" || ids.has(object.id) || object.type !== void 0 && typeof object.type !== "string" || object.attributes !== void 0 && (!record(object.attributes) || !copyJson(object.attributes).ok))
      throw Error("Некорректный объект внешнего каталога");
    ids.add(object.id);
  }
  return {
    version: 1,
    id: value.id,
    label: value.label,
    objects: value.objects.map(
      (o) => ({
        id: o.id,
        name: o.name,
        ...o.type ? { type: o.type } : {},
        ...o.attributes ? { attributes: o.attributes } : {}
      })
    )
  };
}
class RepositoryDesktopController {
  constructor(pickDirectory, relay, indexDirectory) {
    this.pickDirectory = pickDirectory;
    this.relay = relay;
    this.indexDirectory = indexDirectory;
  }
  async open() {
    const dataRoot = await this.pickDirectory();
    return dataRoot ? this.relay({ operation: "legacyOpen", dataRoot, indexDirectory: this.indexDirectory }) : failure("CANCELLED");
  }
  request(value) {
    return this.relay({ operation: "legacyRequest", value });
  }
  async close() {
    await this.relay({ operation: "legacyClose" });
  }
}
class BackendSupervisor {
  constructor(spawn, options = {}) {
    this.spawn = spawn;
    this.options = options;
  }
  child;
  detach = [];
  startupTimer;
  restartTimer;
  pending = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  health = { state: "unavailable", sequence: 0 };
  retries = 0;
  stopping = false;
  stopPromise;
  snapshot() {
    return { ...this.health };
  }
  get pendingCount() {
    return this.pending.size;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  publish(state) {
    this.health = { state, sequence: this.health.sequence + 1 };
    for (const listener of this.listeners) {
      try {
        listener({ type: "health", protocolVersion: 1, health: this.snapshot() });
      } catch {
      }
    }
  }
  start() {
    if (this.stopping || this.child || this.restartTimer) return;
    this.publish("starting");
    try {
      const child = this.spawn();
      this.child = child;
      this.detach = [
        child.onMessage((message) => {
          if (this.child === child) this.receive(message);
        }),
        child.onExit(() => {
          if (this.child === child) this.failed(false);
        })
      ];
      this.startupTimer = setTimeout(() => this.failed(true), this.options.startupMs ?? 5e3);
    } catch {
      this.failed(true);
    }
  }
  receive(value) {
    try {
      const message = parseBackendMessage(value);
      if (message.type === "ready") {
        if (this.health.state !== "starting") throw new RuntimeError("PROTOCOL_ERROR");
        clearTimeout(this.startupTimer);
        this.publish("ready");
      } else {
        if (this.health.state !== "ready") throw new RuntimeError("PROTOCOL_ERROR");
        const entry = this.pending.get(message.requestId);
        if (!entry) return;
        this.pending.delete(message.requestId);
        entry.cleanup();
        if (message.ok) entry.resolve({ ...message.result, sequence: this.health.sequence });
        else entry.reject(new RuntimeError(message.error));
      }
    } catch {
      this.failed(true);
    }
  }
  rejectPending(code) {
    for (const entry of this.pending.values()) {
      entry.cleanup();
      entry.reject(new RuntimeError(code));
    }
    this.pending.clear();
  }
  releaseChild(kill) {
    clearTimeout(this.startupTimer);
    const child = this.child;
    this.child = void 0;
    for (const off of this.detach) off();
    this.detach = [];
    if (kill) {
      try {
        child?.kill();
      } catch {
      }
    }
  }
  failed(kill) {
    this.releaseChild(kill);
    this.rejectPending("UNAVAILABLE");
    if (this.stopping) return;
    this.publish("unavailable");
    if (this.retries < (this.options.maxRestarts ?? 2)) {
      const attempt = ++this.retries;
      this.restartTimer = setTimeout(
        () => {
          this.restartTimer = void 0;
          this.start();
        },
        (this.options.backoffMs ?? 250) * attempt
      );
    }
  }
  request(value, signal) {
    let request;
    try {
      request = parseRequest(value);
    } catch (error) {
      return Promise.reject(error);
    }
    if (signal?.aborted) return Promise.reject(new RuntimeError("CANCELLED"));
    if (this.stopping) return Promise.reject(new RuntimeError("SHUTTING_DOWN"));
    if (this.health.state !== "ready" || !this.child)
      return Promise.reject(new RuntimeError("UNAVAILABLE"));
    if (this.pending.has(request.requestId))
      return Promise.reject(new RuntimeError("INVALID_REQUEST"));
    return new Promise((resolve, reject) => {
      const cancel = (code) => {
        const entry = this.pending.get(request.requestId);
        if (!entry) return;
        this.pending.delete(request.requestId);
        entry.cleanup();
        entry.reject(new RuntimeError(code));
        try {
          this.child?.send({ type: "cancel", requestId: request.requestId });
        } catch {
          this.failed(true);
        }
      };
      const abort = () => cancel("CANCELLED");
      const timer = setTimeout(() => cancel("TIMEOUT"), this.options.requestMs ?? 3e3);
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      };
      this.pending.set(request.requestId, { resolve, reject, cleanup });
      signal?.addEventListener("abort", abort, { once: true });
      try {
        this.child.send(request);
      } catch {
        this.failed(true);
      }
    });
  }
  stop() {
    if (this.stopPromise) return this.stopPromise;
    this.stopping = true;
    clearTimeout(this.restartTimer);
    this.restartTimer = void 0;
    clearTimeout(this.startupTimer);
    this.publish("stopping");
    this.rejectPending("SHUTTING_DOWN");
    const child = this.child;
    this.stopPromise = new Promise((resolve) => {
      if (!child) {
        resolve();
        return;
      }
      let settled = false;
      let off = () => {
      };
      const finish = (kill) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        off();
        this.releaseChild(kill);
        resolve();
      };
      off = child.onExit(() => finish(false));
      const timer = setTimeout(() => finish(true), this.options.shutdownMs ?? 1500);
      try {
        child.send({ type: "shutdown" });
      } catch {
        finish(true);
      }
    });
    return this.stopPromise;
  }
}
electron.protocol.registerSchemesAsPrivileged([
  { scheme: "frade", privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);
let window$1;
let quitting = false;
let closeApproved = false;
if (process.env.FRADE_USER_DATA) electron.app.setPath("userData", process.env.FRADE_USER_DATA);
const workbenchRelay = new WorkbenchRelay((value) => {
  workbench?.observe(value);
  if (window$1 && !window$1.isDestroyed()) window$1.webContents.send(WORKBENCH_EVENT_CHANNEL, value);
});
let workbench;
const repository = new RepositoryDesktopController(
  async () => {
    if (!window$1) return void 0;
    const selected = await electron.dialog.showOpenDialog(window$1, { properties: ["openDirectory"] });
    return selected.canceled ? void 0 : selected.filePaths[0];
  },
  (command) => workbenchRelay.request(command),
  node_path.join(electron.app.getPath("userData"), "repository-indexes")
);
const backend = new BackendSupervisor(() => {
  const child = electron.utilityProcess.fork(node_path.join(__dirname, "../utility/index.cjs"), [], {
    serviceName: "Frade Backend"
  });
  workbenchRelay.attach(child);
  return {
    send: (message) => child.postMessage(message),
    kill: () => {
      child.kill();
    },
    onMessage: (listener) => {
      const filtered = (message) => {
        if (record$1(message) && typeof message.type === "string" && message.type.startsWith("workbench-"))
          return;
        listener(message);
      };
      child.on("message", filtered);
      return () => {
        child.off("message", filtered);
      };
    },
    onExit: (listener) => {
      child.on("exit", listener);
      return () => {
        child.off("exit", listener);
      };
    }
  };
});
const devUrl = !electron.app.isPackaged ? process.env.ELECTRON_RENDERER_URL : void 0;
electron.app.whenReady().then(async () => {
  if (devUrl && !trustedPage(devUrl, devUrl)) throw new Error("Invalid local development URL");
  const rendererRoot = node_path.join(__dirname, "../renderer");
  await electron.protocol.handle("frade", async (request) => {
    try {
      const requested = new URL(request.url);
      const drawio = requested.host === "drawio";
      if (drawio && requested.pathname === "/frade-repository-bridge.js") {
        const parentOrigin = devUrl ? new URL(devUrl).origin : "frade://app";
        return new Response(
          "(" + drawioRepositoryBridge.toString() + ")(" + JSON.stringify(parentOrigin) + ");(" + drawioFlowBridge.toString() + ")(" + JSON.stringify(parentOrigin) + ");(" + drawioThemeBridge.toString() + ")(" + JSON.stringify(parentOrigin) + ");",
          {
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
              "X-Content-Type-Options": "nosniff"
            }
          }
        );
      }
      const path = await resourcePath(
        drawio ? node_path.join(__dirname, "../../vendor/drawio") : rendererRoot,
        drawio ? "frade://app" + requested.pathname : request.url
      );
      const response = await electron.net.fetch(node_url.pathToFileURL(path).href);
      const headers = new Headers(response.headers);
      headers.set(
        "Content-Security-Policy",
        drawio ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'self'; form-action 'none'" : productionCsp
      );
      headers.set("X-Content-Type-Options", "nosniff");
      if (drawio && requested.pathname === "/index.html") {
        const html = (await response.text()).replace(
          '<script src="js/main.js"><\/script>',
          '<script src="frade-repository-bridge.js"><\/script><script src="js/main.js"><\/script>'
        );
        headers.delete("Content-Length");
        return new Response(html, { status: response.status, headers });
      }
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
  electron.session.defaultSession.setPermissionRequestHandler(
    (_wc, _permission, callback) => callback(false)
  );
  electron.session.defaultSession.setPermissionCheckHandler(() => false);
  window$1 = new electron.BrowserWindow({
    width: 1280,
    minWidth: 620,
    minHeight: 450,
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#181818", symbolColor: "#cccccc", height: 35 },
    autoHideMenuBar: true,
    backgroundColor: "#1f1f1f",
    height: 850,
    show: false,
    webPreferences: {
      preload: node_path.join(__dirname, "../preload/index.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false
    }
  });
  const wc = window$1.webContents;
  const presentationEnvironment = {
    colorScheme: electron.nativeTheme.shouldUseDarkColors ? "dark" : "light",
    highContrast: electron.nativeTheme.shouldUseHighContrastColors,
    forcedColors: electron.nativeTheme.inForcedColorsMode
  };
  const updatePresentationEnvironment = () => {
    presentationEnvironment.colorScheme = electron.nativeTheme.shouldUseDarkColors ? "dark" : "light";
    presentationEnvironment.highContrast = electron.nativeTheme.shouldUseHighContrastColors;
    presentationEnvironment.forcedColors = electron.nativeTheme.inForcedColorsMode;
  };
  electron.nativeTheme.on("updated", updatePresentationEnvironment);
  const presentation = createPresentationSettings({
    userData: electron.app.getPath("userData"),
    sessionId: crypto.randomUUID(),
    windowId: wc.id,
    devUrl,
    environment: presentationEnvironment,
    onReady: (bootRevision, rootRevision) => visibility?.presentationReady(bootRevision, rootRevision)
  });
  const presentationBoot = await presentation.initialize();
  const visibility = createPresentationVisibility(
    presentationBoot,
    () => {
      if (window$1 && !window$1.isDestroyed()) window$1.show();
    },
    (reason) => {
      console.error("Presentation startup blocked", reason);
      electron.app.exit(1);
    }
  );
  const presentationSender = (event) => ({
    senderId: event.sender.id,
    mainFrame: event.senderFrame === wc.mainFrame,
    url: event.senderFrame?.url ?? ""
  });
  const bootPresentation = (event, ...args) => {
    try {
      if (args.length !== 0) throw Error("INVALID_PRESENTATION_BOOT");
      event.returnValue = presentation.bootstrap(presentationSender(event));
    } catch (error) {
      event.returnValue = {
        error: error instanceof Error ? error.message : "Presentation bootstrap denied"
      };
    }
  };
  electron.ipcMain.on(PRESENTATION_BOOT_CHANNEL, bootPresentation);
  electron.ipcMain.handle(PRESENTATION_CHANNEL, (event, ...args) => {
    if (args.length !== 1) throw Error("INVALID_PRESENTATION");
    return presentation.request(presentationSender(event), args[0]);
  });
  workbench = new WorkbenchHost({
    settingsFile: node_path.join(electron.app.getPath("userData"), "frade-workspace.json"),
    request: (command) => workbenchRelay.request(command),
    pick: async (kind) => {
      const selected = await electron.dialog.showOpenDialog(window$1, {
        title: kind === "catalog" ? "Подключить внешний каталог объектов" : kind === "data" ? "Выбрать папку данных KA (содержит root.yaml)" : kind === "metadata" ? "Выбрать папку метаописания (_ecosystems_, содержит kadzo)" : "Открыть рабочее пространство",
        properties: ["workspace", "catalog"].includes(kind) ? ["openFile"] : ["openDirectory"],
        ...kind === "workspace" ? { filters: [{ name: "Frade Workspace", extensions: ["frade-workspace"] }] } : {}
      });
      return selected.canceled ? void 0 : selected.filePaths[0];
    },
    save: async () => {
      const selected = await electron.dialog.showSaveDialog(window$1, {
        title: "Сохранить рабочее пространство",
        filters: [{ name: "Frade Workspace", extensions: ["frade-workspace"] }]
      });
      return selected.canceled ? void 0 : selected.filePath;
    },
    close: () => {
      closeApproved = true;
      window$1?.close();
    }
  });
  window$1.on("close", (event) => {
    if (!closeApproved && !quitting) {
      event.preventDefault();
      wc.send(WORKBENCH_CLOSE_CHANNEL);
    }
  });
  const repositorySender = (event) => !!window$1 && !window$1.isDestroyed() && authorizedSender(
    event.sender.id,
    event.senderFrame === wc.mainFrame,
    event.senderFrame?.url ?? "",
    wc.id,
    devUrl
  );
  electron.ipcMain.handle(
    REPOSITORY_OPEN_CHANNEL,
    async (event, ...args) => repositorySender(event) && args.length === 0 ? repository.open() : failure("ACCESS_DENIED")
  );
  electron.ipcMain.handle(
    REPOSITORY_CHANNEL,
    async (event, value) => repositorySender(event) ? repository.request(value) : failure("ACCESS_DENIED")
  );
  electron.ipcMain.handle(
    WORKBENCH_CHANNEL,
    (event, value) => repositorySender(event) ? workbench.command(value) : failure("ACCESS_DENIED")
  );
  electron.ipcMain.handle(
    WORKBENCH_REQUEST_CHANNEL,
    (event, value) => repositorySender(event) ? workbench.request(value) : failure("ACCESS_DENIED")
  );
  wc.setWindowOpenHandler(() => ({ action: "deny" }));
  wc.on("will-navigate", (event, url) => {
    if (!trustedPage(url, devUrl)) event.preventDefault();
  });
  wc.on("will-redirect", (event, url) => {
    if (!trustedPage(url, devUrl)) event.preventDefault();
  });
  wc.on("will-frame-navigate", (event) => {
    if (event.isMainFrame ? !trustedPage(event.url, devUrl) : !event.url.startsWith("frade://drawio/"))
      event.preventDefault();
  });
  wc.on("will-attach-webview", (event) => event.preventDefault());
  electron.ipcMain.handle(REQUEST_CHANNEL, async (event, value) => {
    const id = record$1(value) && validId(value.requestId) ? value.requestId : "invalid";
    if (!window$1 || window$1.isDestroyed() || !authorizedSender(
      event.sender.id,
      event.senderFrame === wc.mainFrame,
      event.senderFrame?.url ?? "",
      wc.id,
      devUrl
    ))
      return failure$1(id, "UNAUTHORIZED");
    try {
      const request = parseRequest(value);
      const result = backend.snapshot().state === "ready" ? await backend.request(request) : backend.snapshot();
      return {
        type: "response",
        protocolVersion: 1,
        requestId: request.requestId,
        ok: true,
        result
      };
    } catch (error) {
      return failure$1(id, error instanceof RuntimeError ? error.code : "UNAVAILABLE");
    }
  });
  const unsubscribe = backend.subscribe((event) => {
    if (!wc.isDestroyed()) wc.send(EVENT_CHANNEL, event);
  });
  window$1.on("closed", () => {
    unsubscribe();
    visibility?.dispose();
    electron.nativeTheme.off("updated", updatePresentationEnvironment);
    electron.ipcMain.removeListener(PRESENTATION_BOOT_CHANNEL, bootPresentation);
    electron.ipcMain.removeHandler(PRESENTATION_CHANNEL);
    electron.ipcMain.removeHandler(REPOSITORY_CHANNEL);
    electron.ipcMain.removeHandler(REPOSITORY_OPEN_CHANNEL);
    void repository.close();
    window$1 = void 0;
  });
  window$1.once("ready-to-show", () => visibility?.nativeReady());
  backend.start();
  await window$1.loadURL(devUrl ?? "frade://app/index.html");
}).catch((error) => {
  console.error("Desktop startup failed", error);
  electron.app.quit();
});
electron.app.on("window-all-closed", () => electron.app.quit());
electron.app.on("before-quit", (event) => {
  if (quitting) return;
  if (window$1 && !closeApproved) {
    event.preventDefault();
    window$1.webContents.send(WORKBENCH_CLOSE_CHANNEL);
    return;
  }
  event.preventDefault();
  quitting = true;
  void Promise.allSettled([backend.stop(), repository.close()]).finally(() => electron.app.quit());
});
