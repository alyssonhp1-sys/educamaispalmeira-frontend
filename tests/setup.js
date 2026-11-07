import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

if (typeof globalThis.Request === "function") {
  const RequisicaoOriginal = globalThis.Request;
  const RequisicaoSemSinal = function Request(input, init = {}) {
    const { signal: _sinal, ...resto } = init || {};
    return new RequisicaoOriginal(input, resto);
  };
  RequisicaoSemSinal.prototype = RequisicaoOriginal.prototype;
  globalThis.Request = RequisicaoSemSinal;
  if (typeof window !== "undefined") window.Request = RequisicaoSemSinal;
}

afterEach(() => {
  cleanup();
});

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
