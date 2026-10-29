import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { requestId } from "./request-id";

const call = (header?: string) => {
  const res = { setHeader: vi.fn() } as unknown as ServerResponse; // Only setHeader is used.
  const req = { headers: header === undefined ? {} : { "x-request-id": header } } as IncomingMessage;
  return { id: requestId(req, res), res };
};

describe("requestId", () => {
  it("keeps a safe incoming id and echoes it", () => {
    const { id, res } = call("nginx-req_42");
    expect(id).toBe("nginx-req_42");
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", "nginx-req_42");
  });

  it.each(["", "a b", "x".repeat(101), "<script>"])("replaces an unsafe id %j with a new one", (header) => {
    expect(call(header).id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
