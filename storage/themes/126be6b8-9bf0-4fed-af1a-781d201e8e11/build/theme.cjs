var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// storage/themes/126be6b8-9bf0-4fed-af1a-781d201e8e11/src/__webbuilder_entry.tsx
var webbuilder_entry_exports = {};
__export(webbuilder_entry_exports, {
  default: () => webbuilder_entry_default,
  manifest: () => manifest,
  templates: () => templates
});
module.exports = __toCommonJS(webbuilder_entry_exports);

// storage/themes/126be6b8-9bf0-4fed-af1a-781d201e8e11/src/entry.tsx
var import_theme_sdk = require("@web-builder/theme-sdk");
var import_jsx_runtime = require("react/jsx-runtime");
function ThemeEntry({
  children,
  sdk
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_theme_sdk.ThemeSdkProvider, { commerce: sdk?.commerce, settings: sdk?.settings, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "ui-sans-serif, system-ui, sans-serif" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_theme_sdk.Header, {}),
    children || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 24 }, children: "No template selected for this route." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_theme_sdk.Footer, {})
  ] }) });
}

// storage/themes/126be6b8-9bf0-4fed-af1a-781d201e8e11/src/pages/home.tsx
var import_react = __toESM(require("react"));
var import_theme_sdk2 = require("@web-builder/theme-sdk");
var import_jsx_runtime2 = require("react/jsx-runtime");
function renderNode(node) {
  if (!node || !node.type) return null;
  if (node.type === "Container") {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { children: (node.children || []).map((c) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react.default.Fragment, { children: renderNode(c) }, c.id || Math.random())) });
  }
  if (node.type === "HeroSection") {
    const title = node.props?.title || "Welcome";
    const subtitle = node.props?.subtitle || "";
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "section",
      {
        style: {
          borderRadius: 18,
          padding: 28,
          background: "linear-gradient(135deg,#2563eb,#60a5fa)",
          color: "#fff"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 42, fontWeight: 800, lineHeight: 1.05 }, children: String(title) }),
          subtitle ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 18, opacity: 0.9, marginTop: 12 }, children: String(subtitle) }) : null
        ]
      }
    );
  }
  if (node.type === "TextBlock") {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { padding: 18, border: "1px solid #eee", borderRadius: 14, marginTop: 14 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { whiteSpace: "pre-wrap" }, children: String(node.props?.text || "") }) });
  }
  return null;
}
function HomePage({ layout }) {
  const products = (0, import_theme_sdk2.useProducts)();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { maxWidth: 1100, margin: "0 auto", padding: 24 }, children: [
    layout && typeof layout === "object" ? renderNode(layout) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { style: { marginTop: 28 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { style: { fontSize: 22, fontWeight: 800, margin: 0 }, children: "Featured products" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { opacity: 0.7, fontSize: 13 }, children: products?.[0] ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
          "Starting at ",
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_theme_sdk2.Money, { cents: products[0].priceCents, currency: products[0].currency })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "No products yet" }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "div",
        {
          style: {
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14
          },
          children: products.map((p) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_theme_sdk2.ProductCard, { product: p }, p.id))
        }
      )
    ] })
  ] });
}

// storage/themes/126be6b8-9bf0-4fed-af1a-781d201e8e11/src/pages/product.tsx
var import_theme_sdk3 = require("@web-builder/theme-sdk");
var import_jsx_runtime3 = require("react/jsx-runtime");
function ProductPage({ handle }) {
  const products = (0, import_theme_sdk3.useProducts)();
  const product = handle ? products.find((p) => p.handle === handle) : products[0];
  if (!product) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { maxWidth: 900, margin: "0 auto", padding: 24 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h1", { style: { fontSize: 28, fontWeight: 800, margin: 0 }, children: "Product not found" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { opacity: 0.7, marginTop: 8 }, children: [
        "handle=",
        handle || "\u2014"
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { maxWidth: 900, margin: "0 auto", padding: 24 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h1", { style: { fontSize: 32, fontWeight: 900, margin: 0 }, children: product.title }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { marginTop: 10, fontSize: 18 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_theme_sdk3.Money, { cents: product.priceCents, currency: product.currency }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { marginTop: 18 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_theme_sdk3.ProductCard, { product }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { marginTop: 24, opacity: 0.7, fontSize: 13 }, children: [
      "Try another: ",
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("a", { href: "/products/demo-product", children: "/products/demo-product" })
    ] })
  ] });
}

// storage/themes/126be6b8-9bf0-4fed-af1a-781d201e8e11/src/__webbuilder_entry.tsx
var manifest = { "schemaVersion": 1, "name": "Default Ecommerce", "version": "1.0.0", "entry": "entry.tsx", "routes": [{ "path": "/", "template": "pages/home" }, { "path": "/products/:handle", "template": "pages/product" }], "sections": [{ "type": "HeroSection", "label": "Hero Section", "propsSchema": { "fields": [{ "type": "text", "id": "title", "label": "Title", "default": "Build. Publish. Sell." }, { "type": "text", "id": "subtitle", "label": "Subtitle", "default": "A default ecommerce theme designed for speed and conversion." }] } }, { "type": "TextBlock", "label": "Text Block", "propsSchema": { "fields": [{ "type": "text", "id": "text", "label": "Text", "default": "Your text here\u2026" }] } }], "settingsSchema": { "schemaVersion": 1, "groups": [{ "id": "brand", "label": "Brand", "fields": [{ "type": "text", "id": "brandName", "label": "Brand name", "default": "Default Ecommerce" }, { "type": "color", "id": "primaryColor", "label": "Primary color", "default": "#2563eb" }] }] } };
var templates = {
  "pages/home": HomePage,
  "pages/product": ProductPage
};
var webbuilder_entry_default = ThemeEntry;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  manifest,
  templates
});
//# sourceMappingURL=theme.cjs.map
