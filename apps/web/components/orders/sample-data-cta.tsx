"use client";

import {
  RiDatabase2Line,
  RiFlashlightLine,
} from "@remixicon/react";
import { useState } from "react";

import { usePopulateSampleOrders } from "../../features/orders/queries";
import { ApiError } from "../../lib/api-client";
import { Alert } from "../ui/alert";
import * as Button from "../ui/button";

export function SampleDataCTA({
  hasOrders,
  className,
}: {
  hasOrders: boolean;
  className?: string;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const populateMutation = usePopulateSampleOrders();

  const handlePopulate = async () => {
    setErrorMessage(null);
    try {
      await populateMutation.mutateAsync();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unable to load demo sample data. Please try again.");
      }
    }
  };

  // As soon as the user has orders (or sample is loaded), dismiss the card completely
  if (hasOrders) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-primary-alpha-10 p-5 ring-1 ring-inset ring-primary-base/25 shadow-regular-xs sm:p-6 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-base text-static-white shadow-button-primary-focus">
            <RiFlashlightLine className="size-6" />
          </span>
          <div className="space-y-1">
            <h3 className="text-label-md font-semibold text-text-strong-950">
              Demo Assignment Dataset
            </h3>
            <p className="max-w-xl text-paragraph-xs text-text-sub-600">
              Populate 6 sample orders covering every status (Pending, Partially paid,
              Paid, Overdue, and Settled-after-overdue) to instantly explore metrics,
              filters, and payment settlement flows.
            </p>

            {errorMessage ? (
              <div className="pt-2">
                <Alert tone="danger">{errorMessage}</Alert>
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0">
          <Button.Root
            variant="primary"
            size="medium"
            type="button"
            onClick={() => void handlePopulate()}
            disabled={populateMutation.isPending}
          >
            <Button.Icon as={RiDatabase2Line} />
            {populateMutation.isPending ? "Loading dataset…" : "Load sample data"}
          </Button.Root>
        </div>
      </div>
    </div>
  );
}
