"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
import { useTheme } from "@/components/theme/useTheme";

const NAMESPACE = "discovery";

type Props = {
  calLink: string;
  enquiryId: string;
  prefill: { name: string; email: string; phone: string; notes: string };
  onBooked: () => void;
};

// Cal.com inline scheduler, prefilled from the enquiry. The enquiry id rides along as
// booking metadata so the webhook can mark the enquiry as booked.
export function CalBooking({ calLink, enquiryId, prefill, onBooked }: Props) {
  const { theme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    getCalApi({ namespace: NAMESPACE }).then((cal) => {
      if (cancelled) return;
      cal("ui", {
        theme,
        hideEventTypeDetails: false,
        layout: "month_view",
        cssVarsPerTheme: {
          light: { "cal-brand": "#262222" },
          dark: { "cal-brand": "#D6D2CC" },
        },
      });
      cal("on", { action: "bookingSuccessfulV2", callback: onBooked });
    });
    return () => {
      cancelled = true;
    };
  }, [theme, onBooked]);

  const config: Record<string, string> = {
    name: prefill.name,
    email: prefill.email,
    notes: prefill.notes,
    layout: "month_view",
    theme,
    "metadata[enquiryId]": enquiryId,
  };
  if (prefill.phone) config.attendeePhoneNumber = prefill.phone;

  return (
    <Cal
      namespace={NAMESPACE}
      calLink={calLink}
      config={config}
      style={{ width: "100%", minHeight: "36rem", overflow: "auto" }}
    />
  );
}
