/**
 * The representative story set used by verify.ts and verify-titles.ts.
 * Kept in its own module so a harness can import it without executing another
 * harness's main().
 */
import type { StoryInput } from "./types.js";

export const STORIES: StoryInput[] = [
  {
    storyId: "US-01", title: "Sync restriction configuration to kiosk",
    description: "As a Store Administrator, I want restriction configurations to sync to V5 kiosks, so that blocked items are enforced at point of sale.",
    acceptanceCriteria:
      "The restriction configuration syncs successfully to a V5 kiosk end-to-end.\n" +
      "When a Single Sale Blocked scan event occurs, the kiosk writes it to the EVENTS table and the downstream Snowflake warehouse reflects it.\n" +
      "The Restriction screen shows the sync status field as \"Synced\" after propagation.",
  },
  {
    storyId: "US-02", title: "Validate product classification field",
    description: "As a Product Manager, I want to set a product classification, so that reporting is accurate.",
    acceptanceCriteria:
      "The classification field accepts values \"rinse-off cosmetic\" and \"leave-on conditioner\".\n" +
      "An invalid classification is rejected with an inline error.",
  },
  {
    storyId: "US-03", title: "Create customer record",
    description: "As a CSR, I want to create a customer record, so that orders can be placed.",
    acceptanceCriteria:
      "A customer record is created and saved to the CUSTOMERS table.\n" +
      "The customer name field is mandatory.",
  },
  {
    storyId: "US-04", title: "Toggle marketing opt-in",
    description: "As a Customer, I want to toggle the marketing opt-in, so that I control communications.",
    acceptanceCriteria: "The marketing opt-in toggle can be enabled and disabled and persists after refresh.",
  },
  {
    storyId: "US-05", title: "Apply discount code at checkout",
    description: "As a Shopper, I want to apply a discount code, so that I pay less.",
    acceptanceCriteria:
      "A valid discount code updates the order total on the Checkout screen.\n" +
      "An expired discount code is rejected with a message.",
  },
  {
    storyId: "US-06", title: "Export report to Snowflake",
    description: "As a Data Analyst, I want the daily report to export, so that dashboards refresh.",
    acceptanceCriteria:
      "The report writes to the REPORTS table and the downstream Snowflake warehouse reflects the new rows end-to-end.\n" +
      "A failed export is retried and logged.",
  },
  {
    storyId: "US-07", title: "Reset password",
    description: "As a User, I want to reset my password, so that I can regain access.",
    acceptanceCriteria: "The password field enforces a minimum length of 8 characters.",
  },
  {
    storyId: "US-08", title: "Assign case to underwriter",
    description: "As a Supervisor, I want to assign a case to an underwriter, so that it gets reviewed.",
    acceptanceCriteria:
      "A case is assigned via the Assignment screen and the assignee field updates.\n" +
      "Assigning to an inactive underwriter is blocked.",
  },
  {
    storyId: "US-09", title: "Update shipping address",
    description: "As a Customer, I want to update my shipping address, so that orders ship correctly.",
    acceptanceCriteria:
      "The shipping address is saved to the ADDRESSES table and shown on the Account screen.\n" +
      "An address with a missing postcode is rejected.",
  },
  {
    storyId: "US-10", title: "Approve purchase order",
    description: "As a Manager, I want to approve a purchase order, so that procurement proceeds.",
    acceptanceCriteria:
      "Approving a purchase order updates its status to \"Approved\" and notifies the downstream ERP end-to-end.\n" +
      "A purchase order over the approval limit is blocked.",
  },
  {
    storyId: "US-11", title: "Search inventory",
    description: "As a Clerk, I want to search inventory, so that I can locate stock.",
    acceptanceCriteria: "The inventory search returns matching rows on the Inventory screen.",
  },
  {
    storyId: "US-12", title: "Configure tax rate",
    description: "As a Finance Admin, I want to configure a tax rate, so that invoices are correct.",
    acceptanceCriteria:
      "A tax rate is saved to the TAX_RATES table and applied on new invoices.\n" +
      "A negative tax rate is rejected.",
  },
];
