import assert from "node:assert/strict";
import test from "node:test";
import { calculateGrossBps, normalizeSocketQuote } from "../src/normalize.js";

function quoteFixture() {
  return {
    success: true,
    statusCode: 200,
    result: {
      originChainId: 8453,
      destinationChainId: 8453,
      input: {
        token: {
          chainId: 8453,
          address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          symbol: "USDC",
          decimals: 6
        },
        amount: "1000000"
      },
      routes: [
        {
          quoteId: "quote-a",
          expiresAt: 1781000089,
          output: {
            token: {
              chainId: 8453,
              address: "0x4200000000000000000000000000000000000006",
              symbol: "WETH",
              decimals: 18
            },
            amount: "350000000000000",
            minAmountOut: "348250000000000"
          },
          estimatedTime: 2,
          slippage: 0.5,
          suggestedSlippage: 0.5,
          routeTags: ["SUGGESTED"],
          routeDetails: {
            dexDetails: {
              protocol: { name: "zeroxv2", displayName: "0x" }
            },
            bridgeDetails: null,
            feeDetails: null
          },
          approval: {
            spenderAddress: "0x0000000000000000000000000000000000000001"
          },
          txData: {
            kind: "evm_tx",
            object: { data: "0x1234", to: "0x0000000000000000000000000000000000000002" }
          },
          gasFee: {
            gasLimit: "200000",
            gasPrice: "1000000",
            estimatedFee: "200000000000",
            feeInUsd: 0.0006
          }
        },
        {
          quoteId: "quote-b",
          expiresAt: 1781000089,
          output: {
            token: {
              chainId: 8453,
              address: "0x4200000000000000000000000000000000000006",
              symbol: "WETH",
              decimals: 18
            },
            amount: "351000000000000",
            minAmountOut: "349245000000000"
          },
          estimatedTime: 2,
          slippage: 0.5,
          routeTags: ["MAX_OUTPUT"],
          routeDetails: {
            dexDetails: {
              protocol: { name: "kyberswap", displayName: "KyberSwap" }
            },
            bridgeDetails: null,
            feeDetails: null
          },
          txData: {
            kind: "evm_tx",
            object: { data: "0xabcd", to: "0x0000000000000000000000000000000000000003" }
          }
        }
      ]
    }
  };
}

test("normalizes quote economics while excluding executable fields", () => {
  const observation = normalizeSocketQuote(quoteFixture(), {
    capturedAt: "2026-07-12T00:00:00.000Z",
    requestLatencyMs: 420,
    serverRequestId: "request-1"
  });

  assert.equal(observation.selectedRoute.provider.id, "kyberswap");
  assert.equal(observation.selectedRoute.output.amount, "351000000000000");
  assert.equal(observation.routeCount, 2);
  assert.equal(observation.routes[0].executableData.persisted, false);
  assert.equal(observation.routes[0].executableData.byteLength, 2);
  assert.equal(typeof observation.routes[0].executableData.sha256, "string");
  assert.equal("txData" in observation.routes[0], false);
  assert.equal("approval" in observation.routes[0], false);
  assert.equal(JSON.stringify(observation).includes("0x1234"), false);
});

test("rejects unsuccessful and empty quote responses", () => {
  assert.throws(
    () => normalizeSocketQuote({ success: false, statusCode: 429 }),
    /successful Socket quote/
  );

  const fixture = quoteFixture();
  fixture.result.routes = [];
  assert.throws(() => normalizeSocketQuote(fixture), /at least one route/);
});

test("calculates signed integer gross basis points", () => {
  assert.equal(calculateGrossBps("1000000", "1000500"), 5n);
  assert.equal(calculateGrossBps("1000000", "999500"), -5n);
  assert.throws(() => calculateGrossBps("0", "1"), /greater than zero/);
});
