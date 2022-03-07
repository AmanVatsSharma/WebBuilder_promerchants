var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// storage/themes/cde4efb2-a61c-4ebd-9e7d-1e4990b4e1d3/src/__webbuilder_entry.tsx
var webbuilder_entry_exports = {};
__export(webbuilder_entry_exports, {
  default: () => webbuilder_entry_default,
  manifest: () => manifest,
  templates: () => templates
});
module.exports = __toCommonJS(webbuilder_entry_exports);

// storage/themes/cde4efb2-a61c-4ebd-9e7d-1e4990b4e1d3/src/entry.tsx
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

// storage/themes/cde4efb2-a61c-4ebd-9e7d-1e4990b4e1d3/src/pages/home.tsx
var import_theme_sdk2 = require("@web-builder/theme-sdk");
var import_jsx_runtime2 = require("react/jsx-runtime");
function HomePage() {
  const products = (0, import_theme_sdk2.useProducts)();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { maxWidth: 1100, margin: "0 auto", padding: 24 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "section",
      {
        style: {
          borderRadius: 18,
          padding: 28,
          background: "linear-gradient(135deg,#2563eb,#60a5fa)",
          color: "#fff"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 42, fontWeight: 800, lineHeight: 1.05 }, children: "Build. Publish. Sell." }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 18, opacity: 0.9, marginTop: 12 }, children: "A default ecommerce theme designed for speed and conversion." }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "a",
              {
                href: "/products",
                style: {
                  background: "#fff",
                  color: "#111",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 600,
                  textDecoration: "none"
                },
                children: "Shop products"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "a",
              {
                href: "/",
                style: {
                  background: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.25)"
                },
                children: "Learn more"
              }
            )
          ] })
        ]
      }
    ),
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

// storage/themes/cde4efb2-a61c-4ebd-9e7d-1e4990b4e1d3/src/__webbuilder_entry.tsx
var manifest = { "schemaVersion": 1, "name": "Default Ecommerce", "version": "1.0.0", "entry": "entry.tsx", "routes": [{ "path": "/", "template": "pages/home" }], "sections": [{ "type": "HeroSection", "label": "Hero Section" }, { "type": "TextBlock", "label": "Text Block" }], "settingsSchema": { "schemaVersion": 1, "groups": [{ "id": "brand", "label": "Brand", "fields": [{ "type": "text", "id": "brandName", "label": "Brand name", "default": "Default Ecommerce" }, { "type": "color", "id": "primaryColor", "label": "Primary color", "default": "#2563eb" }] }] } };
var templates = {
  "pages/home": HomePage
};
var webbuilder_entry_default = ThemeEntry;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  manifest,
  templates
});
//# sourceMappingURL=theme.cjs.map
