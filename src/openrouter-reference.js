import { keccak_256 } from "@noble/hashes/sha3";

const ALLOWANCE_HOLDER_EXEC_SELECTOR = "0x2213bc0b";
const OPENROUTER_ENTRYPOINTS = Object.freeze({
  "0x1bb1a530": "swap",
  "0x324012e2": "swapAndBridge",
  "0xb18248d5": "bridge",
  "0x197aa51e": "performActions"
});

const CONTRACTS = Object.freeze({
  allowanceHolder: Object.freeze({
    address: "0x50c4e75a512f2a14a7b304787adf79c4531a5909",
    runtimeBytecodeHash: "0x0be5794255d21df0f4a10a516428f8d06805779d69b1714297bebcc18971e0b4"
  }),
  openRouter: Object.freeze({
    address: "0x50cfe7c1938db66a1a6d2e86d36f39fbef3d5c4a",
    runtimeBytecodeHash: "0xd1dbc2c8ca87939cadf58e4eb91832cbe44bd5d12e3a0a0d56c76928a818e26b"
  })
});

const SUPPORTED_CHAIN_IDS = new Set([8453, 42161]);
const WORD_BYTES = 32;
const EXEC_STATIC_BYTES = 5 * WORD_BYTES;
const MAX_HEX_BYTES = 256 * 1024;

export const OPENROUTER_REFERENCE = Object.freeze({
  sourceRepository: "https://github.com/SocketDotTech/openrouter",
  sourceCommit: "384b51a1a1e24bb469123c06f8f8bdc6e645f98a",
  sourceCommitDate: "2026-07-02T11:20:51Z",
  license: "GPL-3.0-only",
  contracts: CONTRACTS,
  allowanceHolderExecSelector: ALLOWANCE_HOLDER_EXEC_SELECTOR,
  openRouterEntrypoints: OPENROUTER_ENTRYPOINTS
});

function hexToBytes(value, field) {
  if (typeof value !== "string" || !value.startsWith("0x") || (value.length - 2) % 2 !== 0) {
    throw new TypeError(`${field} must be an even-length 0x-prefixed hex string`);
  }
  if ((value.length - 2) / 2 > MAX_HEX_BYTES) {
    throw new RangeError(`${field} exceeds ${MAX_HEX_BYTES} bytes`);
  }
  if (!/^[0-9a-fA-F]*$/.test(value.slice(2))) {
    throw new TypeError(`${field} must be an even-length 0x-prefixed hex string`);
  }
  return Buffer.from(value.slice(2), "hex");
}

function normalizeAddress(value, field) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new TypeError(`${field} must be a 20-byte address`);
  }
  return value.toLowerCase();
}

function bytesToHex(bytes) {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

function readWord(bytes, offset, field) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset + WORD_BYTES > bytes.length) {
    throw new RangeError(`${field} is outside calldata bounds`);
  }
  return bytes.subarray(offset, offset + WORD_BYTES);
}

function wordToBigInt(word) {
  const hex = Buffer.from(word).toString("hex");
  return BigInt(`0x${hex || "0"}`);
}

function wordToAddress(word, field) {
  if (word.subarray(0, 12).some((byte) => byte !== 0)) {
    throw new TypeError(`${field} has non-zero address padding`);
  }
  return bytesToHex(word.subarray(12)).toLowerCase();
}

function bigIntToSafeNumber(value, field) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${field} exceeds the safe integer range`);
  }
  return Number(value);
}

function parseChainId(value) {
  let parsed;
  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "bigint") {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new TypeError("chainId must be a positive safe integer");
    }
    parsed = Number(value);
  } else if (typeof value === "string" && value.length <= 16 && /^\d+$/.test(value)) {
    parsed = Number(value);
  } else {
    throw new TypeError("chainId must be a positive safe integer");
  }
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TypeError("chainId must be a positive safe integer");
  }
  return parsed;
}

function decodeAllowanceHolderExec(bytes) {
  const argsOffset = 4;
  if (bytes.length < argsOffset + EXEC_STATIC_BYTES + WORD_BYTES) {
    throw new RangeError("AllowanceHolder.exec calldata is too short");
  }

  const operator = wordToAddress(readWord(bytes, argsOffset, "operator"), "operator");
  const token = wordToAddress(readWord(bytes, argsOffset + WORD_BYTES, "token"), "token");
  const amount = wordToBigInt(readWord(bytes, argsOffset + 2 * WORD_BYTES, "amount"));
  const target = wordToAddress(readWord(bytes, argsOffset + 3 * WORD_BYTES, "target"), "target");
  const dynamicOffset = bigIntToSafeNumber(
    wordToBigInt(readWord(bytes, argsOffset + 4 * WORD_BYTES, "data offset")),
    "data offset"
  );

  const dataLengthOffset = argsOffset + dynamicOffset;
  const dataLength = bigIntToSafeNumber(
    wordToBigInt(readWord(bytes, dataLengthOffset, "inner data length")),
    "inner data length"
  );
  const innerStart = dataLengthOffset + WORD_BYTES;
  const innerEnd = innerStart + dataLength;
  if (innerEnd > bytes.length) {
    throw new RangeError("inner OpenRouter calldata exceeds outer calldata bounds");
  }

  const paddedLength = Math.ceil(dataLength / WORD_BYTES) * WORD_BYTES;
  const paddedEnd = innerStart + paddedLength;
  if (paddedEnd > bytes.length) {
    throw new RangeError("inner OpenRouter calldata padding exceeds outer calldata bounds");
  }

  const innerData = bytes.subarray(innerStart, innerEnd);
  const padding = bytes.subarray(innerEnd, paddedEnd);
  return {
    operator,
    token,
    amount: amount.toString(),
    target,
    dynamicOffset,
    canonicalDynamicOffset: dynamicOffset === EXEC_STATIC_BYTES,
    zeroRightPadding: !padding.some((byte) => byte !== 0),
    noTrailingBytes: paddedEnd === bytes.length,
    innerSelector: innerData.length >= 4 ? bytesToHex(innerData.subarray(0, 4)) : null,
    innerByteLength: innerData.length,
    innerCalldataKeccak256: keccak256Hex(innerData)
  };
}

export function keccak256Hex(value) {
  const bytes = typeof value === "string" ? hexToBytes(value, "value") : value;
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("value must be hex or Uint8Array");
  }
  if (bytes.length > MAX_HEX_BYTES) {
    throw new RangeError(`value exceeds ${MAX_HEX_BYTES} bytes`);
  }
  return `0x${Buffer.from(keccak_256(bytes)).toString("hex")}`;
}

export function classifyOpenRouterSelector(selector) {
  if (selector === null) {
    return {
      selector: null,
      entrypoint: "missing",
      recognized: false,
      abiValidated: false,
      executionAllowed: false
    };
  }
  if (typeof selector !== "string" || !/^0x[0-9a-fA-F]{8}$/.test(selector)) {
    throw new TypeError("selector must be a 4-byte hex string or null");
  }
  const normalized = selector.toLowerCase();
  return {
    selector: normalized,
    entrypoint: OPENROUTER_ENTRYPOINTS[normalized] ?? "unknown",
    recognized: normalized in OPENROUTER_ENTRYPOINTS,
    abiValidated: false,
    executionAllowed: false
  };
}

export function inspectAllowanceHolderTransaction({ chainId, to, data }) {
  const numericChainId = parseChainId(chainId);
  const normalizedTo = normalizeAddress(to, "to");
  const bytes = hexToBytes(data, "data");
  const selector = bytes.length >= 4 ? bytesToHex(bytes.subarray(0, 4)) : null;
  const issues = [];

  if (!SUPPORTED_CHAIN_IDS.has(numericChainId)) {
    issues.push("unsupported_chain");
  }
  if (normalizedTo !== CONTRACTS.allowanceHolder.address) {
    issues.push("unexpected_outer_target");
  }
  if (selector !== ALLOWANCE_HOLDER_EXEC_SELECTOR) {
    issues.push("unexpected_outer_selector");
    return {
      referenceCommit: OPENROUTER_REFERENCE.sourceCommit,
      chainId: numericChainId,
      to: normalizedTo,
      calldataByteLength: bytes.length,
      calldataKeccak256: keccak256Hex(bytes),
      outerSelector: selector,
      envelope: null,
      innerCall: null,
      outerEnvelopeCanonical: false,
      referenceTargetsMatch: false,
      executionAllowed: false,
      issues
    };
  }

  let envelope;
  try {
    envelope = decodeAllowanceHolderExec(bytes);
  } catch (error) {
    if (!(error instanceof RangeError) && !(error instanceof TypeError)) {
      throw error;
    }
    return {
      referenceCommit: OPENROUTER_REFERENCE.sourceCommit,
      chainId: numericChainId,
      to: normalizedTo,
      calldataByteLength: bytes.length,
      calldataKeccak256: keccak256Hex(bytes),
      outerSelector: selector,
      envelope: null,
      innerCall: null,
      outerEnvelopeCanonical: false,
      referenceTargetsMatch: false,
      executionAllowed: false,
      issues: [...issues, "malformed_exec_calldata"]
    };
  }
  if (envelope.operator !== CONTRACTS.openRouter.address) {
    issues.push("unexpected_operator");
  }
  if (envelope.target !== CONTRACTS.openRouter.address) {
    issues.push("unexpected_inner_target");
  }
  if (!envelope.canonicalDynamicOffset) {
    issues.push("noncanonical_dynamic_offset");
  }
  if (!envelope.zeroRightPadding) {
    issues.push("nonzero_dynamic_padding");
  }
  if (!envelope.noTrailingBytes) {
    issues.push("trailing_outer_calldata");
  }

  const innerCall = classifyOpenRouterSelector(envelope.innerSelector);
  if (!innerCall.recognized) {
    issues.push("unknown_openrouter_entrypoint");
  } else if (innerCall.entrypoint !== "swap") {
    issues.push("non_swap_openrouter_entrypoint");
  }

  return {
    referenceCommit: OPENROUTER_REFERENCE.sourceCommit,
    chainId: numericChainId,
    to: normalizedTo,
    calldataByteLength: bytes.length,
    calldataKeccak256: keccak256Hex(bytes),
    outerSelector: selector,
    envelope,
    innerCall,
    outerEnvelopeCanonical: envelope.canonicalDynamicOffset
      && envelope.zeroRightPadding
      && envelope.noTrailingBytes,
    referenceTargetsMatch: SUPPORTED_CHAIN_IDS.has(numericChainId)
      && normalizedTo === CONTRACTS.allowanceHolder.address
      && envelope.operator === CONTRACTS.openRouter.address
      && envelope.target === CONTRACTS.openRouter.address,
    executionAllowed: false,
    issues
  };
}

export function compareRuntimeHash({ chainId, contract, address, runtimeBytecodeHash }) {
  const numericChainId = parseChainId(chainId);
  if (!Object.hasOwn(CONTRACTS, contract)) {
    throw new TypeError("contract must be allowanceHolder or openRouter");
  }
  const expected = CONTRACTS[contract];
  const normalizedAddress = normalizeAddress(address, "address");
  if (typeof runtimeBytecodeHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(runtimeBytecodeHash)) {
    throw new TypeError("runtimeBytecodeHash must be a 32-byte hex string");
  }
  const actualHash = runtimeBytecodeHash.toLowerCase();
  const issues = [];
  if (!SUPPORTED_CHAIN_IDS.has(numericChainId)) {
    issues.push("unsupported_chain");
  }
  if (normalizedAddress !== expected.address) {
    issues.push("unexpected_contract_address");
  }
  if (actualHash !== expected.runtimeBytecodeHash) {
    issues.push("runtime_bytecode_hash_mismatch");
  }
  return {
    referenceCommit: OPENROUTER_REFERENCE.sourceCommit,
    chainId: numericChainId,
    contract,
    address: normalizedAddress,
    expectedAddress: expected.address,
    actualRuntimeBytecodeHash: actualHash,
    expectedRuntimeBytecodeHash: expected.runtimeBytecodeHash,
    matchesPinnedHash: issues.length === 0,
    provenance: "caller_supplied_hash",
    executionAllowed: false,
    issues
  };
}

export function compareRuntimeBytecode({ chainId, contract, address, runtimeBytecode }) {
  const bytes = hexToBytes(runtimeBytecode, "runtimeBytecode");
  const result = compareRuntimeHash({
    chainId,
    contract,
    address,
    runtimeBytecodeHash: keccak256Hex(bytes)
  });
  if (bytes.length === 0) {
    result.matchesPinnedHash = false;
    result.issues = [...result.issues, "empty_runtime_bytecode"];
  }
  return {
    ...result,
    provenance: "caller_supplied_bytecode",
    runtimeByteLength: bytes.length
  };
}
