import assert from "node:assert/strict";
import test from "node:test";
import {
  OPENROUTER_REFERENCE,
  classifyOpenRouterSelector,
  compareRuntimeBytecode,
  compareRuntimeHash,
  inspectAllowanceHolderTransaction,
  keccak256Hex
} from "../src/openrouter-reference.js";

const ALLOWANCE_HOLDER = OPENROUTER_REFERENCE.contracts.allowanceHolder.address;
const OPENROUTER = OPENROUTER_REFERENCE.contracts.openRouter.address;

function wordFromBigInt(value) {
  return value.toString(16).padStart(64, "0");
}

function wordFromAddress(address) {
  return address.slice(2).toLowerCase().padStart(64, "0");
}

function encodeAllowanceHolderExec({
  operator = OPENROUTER,
  token,
  amount,
  target = OPENROUTER,
  innerData,
  dynamicOffset = 160n,
  gapWords = 0
}) {
  const inner = innerData.slice(2).toLowerCase();
  const paddedInner = inner.padEnd(Math.ceil(inner.length / 64) * 64, "0");
  return `0x2213bc0b${wordFromAddress(operator)}${wordFromAddress(token)}${wordFromBigInt(amount)}${wordFromAddress(target)}${wordFromBigInt(dynamicOffset)}${"0".repeat(gapWords * 64)}${wordFromBigInt(BigInt(inner.length / 2))}${paddedInner}`;
}

test("pins independently asserted upstream constants", () => {
  assert.equal(ALLOWANCE_HOLDER, "0x50c4e75a512f2a14a7b304787adf79c4531a5909");
  assert.equal(OPENROUTER, "0x50cfe7c1938db66a1a6d2e86d36f39fbef3d5c4a");
  assert.equal(
    OPENROUTER_REFERENCE.contracts.allowanceHolder.runtimeBytecodeHash,
    "0x0be5794255d21df0f4a10a516428f8d06805779d69b1714297bebcc18971e0b4"
  );
  assert.equal(
    OPENROUTER_REFERENCE.contracts.openRouter.runtimeBytecodeHash,
    "0xd1dbc2c8ca87939cadf58e4eb91832cbe44bd5d12e3a0a0d56c76928a818e26b"
  );
});

test("decodes a canonical AllowanceHolder swap envelope without retaining calldata", () => {
  const data = encodeAllowanceHolderExec({
    token: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
    amount: 1_000_000n,
    innerData: "0x1bb1a530deadbeef"
  });
  const result = inspectAllowanceHolderTransaction({ chainId: 8453, to: ALLOWANCE_HOLDER, data });

  assert.equal(result.outerEnvelopeCanonical, true);
  assert.equal(result.referenceTargetsMatch, true);
  assert.equal(result.executionAllowed, false);
  assert.equal(result.envelope.amount, "1000000");
  assert.equal(result.envelope.innerByteLength, 8);
  assert.equal(result.innerCall.entrypoint, "swap");
  assert.equal(result.innerCall.abiValidated, false);
  assert.deepEqual(result.issues, []);
  assert.equal("data" in result, false);
  assert.equal(JSON.stringify(result).includes("deadbeef"), false);
});

test("flags generic and cross-chain OpenRouter entrypoints", () => {
  for (const [selector, entrypoint] of [
    ["0x197aa51e", "performActions"],
    ["0x324012e2", "swapAndBridge"],
    ["0xb18248d5", "bridge"]
  ]) {
    const data = encodeAllowanceHolderExec({
      token: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      amount: 10_000_000n,
      innerData: `${selector}00000000`
    });
    const result = inspectAllowanceHolderTransaction({ chainId: 42161, to: ALLOWANCE_HOLDER, data });
    assert.equal(result.innerCall.entrypoint, entrypoint);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.outerEnvelopeCanonical, true);
    assert.equal(result.referenceTargetsMatch, true);
    assert.ok(result.issues.includes("non_swap_openrouter_entrypoint"));
  }
});

test("flags unsupported chains, targets, and selectors without decoding them", () => {
  const result = inspectAllowanceHolderTransaction({
    chainId: 1,
    to: "0x0000000000000000000000000000000000000001",
    data: "0x12345678"
  });
  assert.equal(result.outerEnvelopeCanonical, false);
  assert.equal(result.referenceTargetsMatch, false);
  assert.equal(result.envelope, null);
  assert.deepEqual(result.issues, [
    "unsupported_chain",
    "unexpected_outer_target",
    "unexpected_outer_selector"
  ]);
});

test("reports truncated dynamic calldata without throwing", () => {
  const valid = encodeAllowanceHolderExec({
    token: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
    amount: 1n,
    innerData: "0x1bb1a530"
  });
  const result = inspectAllowanceHolderTransaction({
    chainId: 8453,
    to: ALLOWANCE_HOLDER,
    data: valid.slice(0, -64)
  });
  assert.equal(result.outerEnvelopeCanonical, false);
  assert.equal(result.envelope, null);
  assert.ok(result.issues.includes("malformed_exec_calldata"));
});

test("flags nonzero padding and trailing outer calldata", () => {
  const valid = encodeAllowanceHolderExec({
    token: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
    amount: 1n,
    innerData: "0x1bb1a530ff"
  });
  const nonzeroPadding = `${valid.slice(0, -2)}01`;
  const padded = inspectAllowanceHolderTransaction({ chainId: 8453, to: ALLOWANCE_HOLDER, data: nonzeroPadding });
  assert.equal(padded.outerEnvelopeCanonical, false);
  assert.ok(padded.issues.includes("nonzero_dynamic_padding"));

  const trailing = inspectAllowanceHolderTransaction({
    chainId: 8453,
    to: ALLOWANCE_HOLDER,
    data: `${valid}${"00".repeat(32)}`
  });
  assert.equal(trailing.outerEnvelopeCanonical, false);
  assert.ok(trailing.issues.includes("trailing_outer_calldata"));
});

test("flags decodable noncanonical offsets and malformed address padding", () => {
  const noncanonical = encodeAllowanceHolderExec({
    token: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
    amount: 1n,
    innerData: "0x1bb1a530",
    dynamicOffset: 192n,
    gapWords: 1
  });
  const offsetResult = inspectAllowanceHolderTransaction({
    chainId: 8453,
    to: ALLOWANCE_HOLDER,
    data: noncanonical
  });
  assert.equal(offsetResult.outerEnvelopeCanonical, false);
  assert.ok(offsetResult.issues.includes("noncanonical_dynamic_offset"));

  const canonical = encodeAllowanceHolderExec({
    token: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
    amount: 1n,
    innerData: "0x1bb1a530"
  });
  const badOperatorPadding = `${canonical.slice(0, 10)}01${canonical.slice(12)}`;
  const paddingResult = inspectAllowanceHolderTransaction({
    chainId: 8453,
    to: ALLOWANCE_HOLDER,
    data: badOperatorPadding
  });
  assert.equal(paddingResult.outerEnvelopeCanonical, false);
  assert.ok(paddingResult.issues.includes("malformed_exec_calldata"));
});

test("classifies selectors and never grants execution approval", () => {
  assert.deepEqual(classifyOpenRouterSelector("0x1bb1a530"), {
    selector: "0x1bb1a530",
    entrypoint: "swap",
    recognized: true,
    abiValidated: false,
    executionAllowed: false
  });
  assert.equal(classifyOpenRouterSelector("0xffffffff").entrypoint, "unknown");
  assert.equal(classifyOpenRouterSelector(null).entrypoint, "missing");
});

test("compares pinned runtime hashes and reports caller-supplied provenance", () => {
  const pinned = compareRuntimeHash({
    chainId: 8453,
    contract: "openRouter",
    address: OPENROUTER,
    runtimeBytecodeHash: OPENROUTER_REFERENCE.contracts.openRouter.runtimeBytecodeHash
  });
  assert.equal(pinned.matchesPinnedHash, true);
  assert.equal(pinned.provenance, "caller_supplied_hash");
  assert.equal(pinned.executionAllowed, false);

  const empty = compareRuntimeBytecode({
    chainId: 42161,
    contract: "allowanceHolder",
    address: ALLOWANCE_HOLDER,
    runtimeBytecode: "0x"
  });
  assert.equal(empty.matchesPinnedHash, false);
  assert.equal(empty.provenance, "caller_supplied_bytecode");
  assert.ok(empty.issues.includes("runtime_bytecode_hash_mismatch"));
  assert.ok(empty.issues.includes("empty_runtime_bytecode"));

  const mismatch = compareRuntimeHash({
    chainId: 1,
    contract: "openRouter",
    address: "0x0000000000000000000000000000000000000001",
    runtimeBytecodeHash: `0x${"00".repeat(32)}`
  });
  assert.equal(mismatch.matchesPinnedHash, false);
  assert.deepEqual(mismatch.issues, [
    "unsupported_chain",
    "unexpected_contract_address",
    "runtime_bytecode_hash_mismatch"
  ]);
});

test("uses Ethereum Keccak-256 rather than standardized SHA3-256", () => {
  assert.equal(
    keccak256Hex("0x"),
    "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
  );
});

test("bounds hostile byte arrays and chain identifiers", () => {
  assert.throws(() => keccak256Hex(new Uint8Array(256 * 1024 + 1)), /exceeds/);
  assert.throws(
    () => inspectAllowanceHolderTransaction({
      chainId: "9".repeat(17),
      to: ALLOWANCE_HOLDER,
      data: "0x"
    }),
    /positive safe integer/
  );
});
