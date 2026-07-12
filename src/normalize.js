import { createHash } from "node:crypto";

function requireObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function requireIntegerString(value, field) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new TypeError(`${field} must be an unsigned integer string`);
  }
  return value;
}

function optionalIntegerString(value, field) {
  return value === undefined || value === null
    ? null
    : requireIntegerString(value, field);
}

function requireFiniteNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
  return value;
}

function transactionFingerprint(txData) {
  const data = txData?.object?.data;
  if (typeof data !== "string" || !/^0x[0-9a-fA-F]*$/.test(data)) {
    return { byteLength: null, sha256: null };
  }

  return {
    byteLength: Math.max(0, (data.length - 2) / 2),
    sha256: createHash("sha256").update(data.toLowerCase()).digest("hex")
  };
}

function normalizeRoute(route) {
  requireObject(route, "route");
  const output = requireObject(route.output, "route.output");
  const token = requireObject(output.token, "route.output.token");
  const routeDetails = requireObject(route.routeDetails, "route.routeDetails");
  const dexDetails = routeDetails.dexDetails;
  const bridgeDetails = routeDetails.bridgeDetails;
  const provider = dexDetails?.protocol ?? bridgeDetails?.protocol;
  const fingerprint = transactionFingerprint(route.txData);

  if (!provider || typeof provider.name !== "string" || provider.name.length === 0) {
    throw new TypeError("route provider name is required");
  }

  return {
    quoteId: typeof route.quoteId === "string" ? route.quoteId : null,
    expiresAt: requireFiniteNumber(route.expiresAt, "route.expiresAt"),
    output: {
      chainId: requireFiniteNumber(token.chainId, "route.output.token.chainId"),
      tokenAddress: String(token.address).toLowerCase(),
      symbol: String(token.symbol),
      decimals: requireFiniteNumber(token.decimals, "route.output.token.decimals"),
      amount: requireIntegerString(output.amount, "route.output.amount"),
      minAmountOut: requireIntegerString(output.minAmountOut, "route.output.minAmountOut")
    },
    provider: {
      id: provider.name,
      displayName: typeof provider.displayName === "string" ? provider.displayName : null,
      kind: dexDetails ? "dex-aggregator" : "bridge"
    },
    estimatedTimeSeconds: requireFiniteNumber(route.estimatedTime, "route.estimatedTime"),
    slippagePercent: requireFiniteNumber(route.slippage, "route.slippage"),
    suggestedSlippagePercent: typeof route.suggestedSlippage === "number"
      ? requireFiniteNumber(route.suggestedSlippage, "route.suggestedSlippage")
      : null,
    routeTags: Array.isArray(route.routeTags) ? route.routeTags.map(String) : [],
    feeDetails: routeDetails.feeDetails ?? null,
    gas: route.gasFee ? {
      gasLimit: optionalIntegerString(route.gasFee.gasLimit, "route.gasFee.gasLimit"),
      gasPrice: optionalIntegerString(route.gasFee.gasPrice, "route.gasFee.gasPrice"),
      estimatedFee: optionalIntegerString(route.gasFee.estimatedFee, "route.gasFee.estimatedFee"),
      feeInUsd: typeof route.gasFee.feeInUsd === "number"
        ? requireFiniteNumber(route.gasFee.feeInUsd, "route.gasFee.feeInUsd")
        : null
    } : null,
    executableData: {
      persisted: false,
      byteLength: fingerprint.byteLength,
      sha256: fingerprint.sha256
    }
  };
}

export function normalizeSocketQuote(response, context = {}) {
  requireObject(response, "response");
  if (response.success !== true || response.statusCode !== 200) {
    throw new TypeError("response must be a successful Socket quote");
  }

  const result = requireObject(response.result, "response.result");
  const input = requireObject(result.input, "response.result.input");
  const inputToken = requireObject(input.token, "response.result.input.token");
  if (!Array.isArray(result.routes) || result.routes.length === 0) {
    throw new TypeError("response.result.routes must contain at least one route");
  }

  const routes = result.routes.map(normalizeRoute);
  const selectedRoute = routes.reduce((best, candidate) =>
    BigInt(candidate.output.amount) > BigInt(best.output.amount) ? candidate : best
  );

  const capturedAt = context.capturedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(capturedAt))) {
    throw new TypeError("context.capturedAt must be an ISO timestamp");
  }

  return {
    schemaVersion: 1,
    capturedAt,
    requestLatencyMs: context.requestLatencyMs === undefined
      ? null
      : requireFiniteNumber(context.requestLatencyMs, "context.requestLatencyMs"),
    serverRequestId: typeof context.serverRequestId === "string" ? context.serverRequestId : null,
    originChainId: requireFiniteNumber(result.originChainId, "response.result.originChainId"),
    destinationChainId: requireFiniteNumber(result.destinationChainId, "response.result.destinationChainId"),
    input: {
      tokenAddress: String(inputToken.address).toLowerCase(),
      symbol: String(inputToken.symbol),
      decimals: requireFiniteNumber(inputToken.decimals, "response.result.input.token.decimals"),
      amount: requireIntegerString(input.amount, "response.result.input.amount")
    },
    selectedRoute,
    routeCount: routes.length,
    routes
  };
}

export function calculateGrossBps(inputAmount, outputAmount) {
  const input = BigInt(requireIntegerString(inputAmount, "inputAmount"));
  const output = BigInt(requireIntegerString(outputAmount, "outputAmount"));
  if (input === 0n) {
    throw new RangeError("inputAmount must be greater than zero");
  }
  return ((output - input) * 10_000n) / input;
}
