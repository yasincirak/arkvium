import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { istemciIpAdresi } = await import("../src/lib/request-ip.ts");

describe("istemci IP adresi okuma", () => {
  test("x-forwarded-for başlığındaki ilk adresi alır", () => {
    const basliklar = new Headers({
      "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178",
    });

    assert.equal(istemciIpAdresi(basliklar), "203.0.113.5");
  });

  test("tek adresli x-forwarded-for başlığını okur", () => {
    const basliklar = new Headers({ "x-forwarded-for": "203.0.113.5" });

    assert.equal(istemciIpAdresi(basliklar), "203.0.113.5");
  });

  test("x-forwarded-for yoksa x-real-ip kullanılır", () => {
    const basliklar = new Headers({ "x-real-ip": "198.51.100.7" });

    assert.equal(istemciIpAdresi(basliklar), "198.51.100.7");
  });

  test("hiçbir başlık yoksa sabit bir değere düşer", () => {
    assert.equal(istemciIpAdresi(new Headers()), "bilinmeyen");
  });

  test("boş x-forwarded-for başlığı sabit değere düşer", () => {
    const basliklar = new Headers({ "x-forwarded-for": "" });

    assert.equal(istemciIpAdresi(basliklar), "bilinmeyen");
  });
});
