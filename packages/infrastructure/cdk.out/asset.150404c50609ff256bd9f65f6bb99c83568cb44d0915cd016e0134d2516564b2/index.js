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

// packages/infrastructure/src/lambdaedge/computeSha256.ts
var computeSha256_exports = {};
__export(computeSha256_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(computeSha256_exports);
var crypto = __toESM(require("crypto"), 1);
var handler = async (event) => {
  const request = event.Records[0].cf.request;
  const method = request.method;
  if (method === "POST" || method === "PUT") {
    if (request.body && request.body.data) {
      const data = request.body.data;
      const encoding = request.body.encoding || "text";
      let payload;
      if (encoding === "base64") {
        payload = Buffer.from(data, "base64");
      } else {
        payload = data;
      }
      const hash = crypto.createHash("sha256");
      hash.update(payload);
      const digest = hash.digest("hex");
      request.headers["x-amz-content-sha256"] = [{ key: "x-amz-content-sha256", value: digest }];
    }
  }
  return request;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
