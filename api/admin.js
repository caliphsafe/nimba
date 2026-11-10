import abandonedHandler from "../server/admin/admin-abandoned.js";
import collectionsHandler from "../server/admin/admin-collections.js";
import customersHandler from "../server/admin/admin-customers.js";
import dashboardHandler from "../server/admin/admin-dashboard.js";
import discountsHandler from "../server/admin/admin-discounts.js";
import draftOrdersHandler from "../server/admin/admin-draft-orders.js";
import inventoryUpdateHandler from "../server/admin/admin-inventory-update.js";
import locationsHandler from "../server/admin/admin-locations.js";
import loginHandler from "../server/admin/admin-login.js";
import logoutHandler from "../server/admin/admin-logout.js";
import ordersHandler from "../server/admin/admin-orders.js";
import productDeleteHandler from "../server/admin/admin-product-delete.js";
import productSaveHandler from "../server/admin/admin-product-save.js";
import productStatusHandler from "../server/admin/admin-product-status.js";
import productHandler from "../server/admin/admin-product.js";
import productsHandler from "../server/admin/admin-products.js";
import sessionHandler from "../server/admin/admin-session.js";
import shopEditorHandler from "../server/admin/admin-shop-editor.js";
import uploadHandler from "../server/admin/admin-upload.js";
import {requireAdmin} from "../server/admin/_admin-auth.js";

const actions = Object.freeze({
  "abandoned": abandonedHandler,
  "collections": collectionsHandler,
  "customers": customersHandler,
  "dashboard": dashboardHandler,
  "discounts": discountsHandler,
  "draft-orders": draftOrdersHandler,
  "inventory-update": inventoryUpdateHandler,
  "locations": locationsHandler,
  "login": loginHandler,
  "logout": logoutHandler,
  "orders": ordersHandler,
  "product-delete": productDeleteHandler,
  "product-save": productSaveHandler,
  "product-status": productStatusHandler,
  "product": productHandler,
  "products": productsHandler,
  "session": sessionHandler,
  "shop-editor": shopEditorHandler,
  "upload": uploadHandler,
});

export default async function admin(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const action = req.query?.__action;
  if (!Object.hasOwn(actions, action)) {
    return res.status(404).json({error: "Unknown admin action"});
  }

  if (req.method === "POST") {
    const host = req.headers.host;
    if (!host || req.headers.origin !== `https://${host}` ||
        (req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin")) {
      return res.status(403).json({error: "Invalid request origin"});
    }
  }

  if (action !== "login" && !requireAdmin(req, res)) return;
  return actions[action](req, res);
}
