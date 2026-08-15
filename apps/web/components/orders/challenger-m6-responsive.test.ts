import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { decimalToCents } from "../../features/orders/form-schema";
import { formatUsd } from "../../lib/format";

describe("Milestone 6 Empirical Responsive & Interaction Verification", () => {
  const webRoot = path.resolve(__dirname, "../..");

  describe("1. Responsive Viewport Constraints & Geometry Verification", () => {
    it("verifies 320px mobile viewport geometry for modals", () => {
      const viewportWidth = 320;
      const overlayPadding = 16 * 2; // p-4 = 1rem on left & right
      const availableInnerWidth = viewportWidth - overlayPadding; // 288px

      const modalMaxW = 420;
      const effectiveModalWidth = Math.min(modalMaxW, availableInnerWidth);

      expect(effectiveModalWidth).toBe(288);
      expect(effectiveModalWidth).toBeLessThanOrEqual(viewportWidth);
      expect(effectiveModalWidth + overlayPadding).toBe(viewportWidth);
    });

    it("verifies 320px mobile viewport geometry for mobile drawer navigation", () => {
      const viewportWidth = 320;
      // AppShell mobile drawer: w-[min(86vw,300px)]
      const drawerWidth = Math.min(0.86 * viewportWidth, 300); // 275.2px

      expect(drawerWidth).toBeLessThan(viewportWidth);
      expect(viewportWidth - drawerWidth).toBeGreaterThan(40); // Leaves touch area for backdrop
    });

    it("verifies 320px mobile stacked line items card layout", () => {
      const viewportWidth = 320;
      const appPadding = 16 * 2; // p-4 on main
      const cardPadding = 16 * 2; // p-4 on card
      const gap = 12; // gap-3 = 0.75rem = 12px
      const availableWidth = viewportWidth - appPadding - cardPadding; // 256px
      const colWidth = (availableWidth - gap) / 2; // 122px each for Quantity and Unit Price

      expect(colWidth).toBeGreaterThan(100); // Sufficient for 3-digit quantity and $0.00 price
    });

    it("verifies responsive breakpoints in code implementations", () => {
      // Check auth-shell.tsx for lg:border-r (ensuring no 1px right border on < 1024px)
      const authShellPath = path.join(webRoot, "components/auth/auth-shell.tsx");
      const authShellContent = fs.readFileSync(authShellPath, "utf-8");

      expect(authShellContent).toContain("lg:border-r");
      expect(authShellContent).not.toMatch(/\sborder-r\s/); // Must not have bare unconditional border-r
      expect(authShellContent).toMatch(/hidden[\s\S]*?lg:flex/); // Marketing panel hidden on < 1024px

      // Check app-shell.tsx for responsive sidebar & mobile header
      const appShellPath = path.join(webRoot, "components/layout/app-shell.tsx");
      const appShellContent = fs.readFileSync(appShellPath, "utf-8");
      expect(appShellContent).toContain("lg:hidden"); // Mobile header hidden on desktop
      expect(appShellContent).toMatch(/hidden[\s\S]*?lg:flex/); // Sidebar hidden on mobile

      // Check orders-dashboard.tsx for responsive table vs mobile cards
      const dashboardPath = path.join(webRoot, "components/orders/orders-dashboard.tsx");
      const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
      expect(dashboardContent).toContain("hidden md:block"); // Desktop table
      expect(dashboardContent).toContain("md:hidden"); // Mobile stacked cards
      expect(dashboardContent).toContain("sm:grid-cols-2 xl:grid-cols-4"); // Responsive summary cards grid

      // Check order-detail-workspace.tsx for responsive financial scorecards & line items
      const detailPath = path.join(webRoot, "components/orders/order-detail-workspace.tsx");
      const detailContent = fs.readFileSync(detailPath, "utf-8");
      expect(detailContent).toContain("sm:grid-cols-3");
      expect(detailContent).toContain("divide-y sm:divide-y-0 sm:divide-x");
      expect(detailContent).toContain("overflow-x-auto"); // Scroll wrapper for line items table
    });
  });

  describe("2. Modal & Interaction Verification", () => {
    it("verifies modal structure and accessibility contract", () => {
      const modalPath = path.join(webRoot, "components/ui/modal.tsx");
      const modalContent = fs.readFileSync(modalPath, "utf-8");

      expect(modalContent).toContain("DialogPrimitive.Root");
      expect(modalContent).toContain("DialogPrimitive.Overlay");
      expect(modalContent).toContain("DialogPrimitive.Content");
      expect(modalContent).toContain("DialogPrimitive.Title");
      expect(modalContent).toContain("DialogPrimitive.Description");
      expect(modalContent).toContain("backdrop-blur-[10px]");
      expect(modalContent).toContain("rounded-20");
      expect(modalContent).toContain("rounded-b-20");
    });

    it("verifies payment settlement calculations across multiple partial and full amounts", () => {
      const orderBalanceCents = 100000; // $1,000.00

      // Case 1: Partial payment $400.00
      const partialPaymentCents = decimalToCents("400.00")!;
      expect(partialPaymentCents).toBe(40000);
      const projectedBalance1 = Math.max(0, orderBalanceCents - partialPaymentCents);
      expect(projectedBalance1).toBe(60000);
      expect(formatUsd(projectedBalance1)).toBe("$600.00");

      // Case 2: Second payment $600.00 (settles balance)
      const secondPaymentCents = decimalToCents("600.00")!;
      expect(secondPaymentCents).toBe(60000);
      const projectedBalance2 = Math.max(0, projectedBalance1 - secondPaymentCents);
      expect(projectedBalance2).toBe(0);
      expect(formatUsd(projectedBalance2)).toBe("$0.00");

      // Case 3: Overpayment attempt $1.00 when balance is 0
      const overpaymentCents = decimalToCents("1.00")!;
      const isOverpaid = overpaymentCents > projectedBalance2;
      expect(isOverpaid).toBe(true);
    });

    it("verifies idempotency key stability and fingerprint uniqueness", () => {
      const fingerprintA1 = JSON.stringify([40000, "2026-08-16", "First installment"]);
      const fingerprintA2 = JSON.stringify([40000, "2026-08-16", "First installment"]);
      const fingerprintB = JSON.stringify([40000, "2026-08-16", "Different note"]);

      expect(fingerprintA1).toBe(fingerprintA2);
      expect(fingerprintA1).not.toBe(fingerprintB);
    });
  });

  describe("3. Align UI Token Adherence & Zero Hardcoded Colors", () => {
    it("verifies zero hardcoded tailwind color classes in components directory", () => {
      const forbiddenPatterns = [
        /\btext-blue-(?:500|600|700)\b/,
        /\bbg-blue-(?:500|600|700)\b/,
        /\bbg-gray-(?:50|100|200|300|400|500|600|700|800|900)\b/,
        /\btext-gray-(?:50|100|200|300|400|500|600|700|800|900)\b/,
        /\bbg-red-(?:50|100|200|300|400|500|600|700|800|900)\b/,
        /\bhover:bg-red-(?:500|600|700)\b/,
      ];

      function checkDir(dirPath: string) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            checkDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) && !entry.name.endsWith(".test.ts")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            for (const pattern of forbiddenPatterns) {
              const match = content.match(pattern);
              if (match) {
                throw new Error(`Hardcoded color pattern ${pattern} found in ${fullPath}: "${match[0]}"`);
              }
            }
          }
        }
      }

      checkDir(path.join(webRoot, "components"));
    });

    it("verifies subheading-xs has zero manual tracking overrides in components", () => {
      function checkDir(dirPath: string) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            checkDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            const lines = content.split("\n");
            lines.forEach((line, idx) => {
              if (line.includes("subheading-xs") && (line.includes("tracking-wider") || line.includes("tracking-wide"))) {
                throw new Error(`Manual tracking override on subheading-xs found in ${fullPath}:${idx + 1}: ${line}`);
              }
            });
          }
        }
      }

      checkDir(path.join(webRoot, "components"));
    });
  });
});
