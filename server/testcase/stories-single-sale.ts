/**
 * The 12 Sale Qty Restriction user stories, verbatim from the sprint input.
 * Acceptance criteria are kept EXACTLY as written (no truncation, no rewording)
 * so generated cases trace back to the real text.
 */
import type { StoryInput } from "./types.js";

export const SINGLE_SALE_STORIES: StoryInput[] = [
  {
    storyId: "T01",
    title: "ADM: Location-Level Restriction Toggle",
    description:
      "As an operator, I want to enable or disable Sale Qty Restriction per location, so that I can control where the feature applies. " +
      "Operators need a location-level setting in ADM that turns the Sale Qty Restriction feature on or off. This setting lives on the Location Summary page, is independent per location, and must be visible enough that an operator can quickly confirm its current state. Operators without the correct permission should not see this control at all. The page must be saveable even when the toggle is turned on but no products have been tagged yet.",
    acceptanceCriteria: [
      `Add a "Sale Qty Restriction" Yes/No setting to the Location Summary page (Info Section), below the "Promotion Spotlight Title Banner" field. Default value is No.`,
      `The setting applies at the location level; each location can independently enable or disable it.`,
      `The current toggle state is clearly visible on the Location Summary page.`,
      `The page can be saved successfully even if the toggle is set to Yes and no products are tagged as restricted.`,
      `If the operator does not have the required permission, the toggle must be hidden entirely (not just disabled).`,
    ].join("\n"),
  },
  {
    storyId: "T02",
    title: "ADM: Product Tagging (Choose Items Modal)",
    description:
      "As an operator, I want to select which products are restricted and set each one's quantity limit, so that I can control specific items at my location. " +
      "Once Sale Qty Restriction is enabled for a location, operators need a way to choose exactly which products are restricted and what quantity limit (1 to 5, default 1) applies to each, through a Choose Items modal with multi-select checkboxes, real-time search and a filter. Saving inside the modal only holds the selection locally. Every tagging change must be timestamped for audit purposes.",
    acceptanceCriteria: [
      `A "Choose Items" button becomes available only when Sale Qty Restriction is set to Yes. Clicking it opens a modal listing products extended to that location.`,
      `The modal supports multi-selection of products via checkboxes.`,
      `Each selected (checked) product shows a quantity dropdown with values 1 through 5. The dropdown is disabled until the product is checked.`,
      `The default quantity for a newly tagged product is 1.`,
      `A search input filters the product list in real time by product name or scancode.`,
      `A filter dropdown offers All, Selected, and Unselected (default: All). When "Selected" is chosen, a note explains that only submitted items are shown (due to remote pagination).`,
      `Operators can both tag and un-tag a product from the same UI. Products are untagged by default.`,
      `Saving inside the modal keeps selections and quantities locally only. Saving the Location Summary page persists the changes to the productlocation and pricingrec tables.`,
      `Every change to a product's restriction tag is timestamped and auditable.`,
      `A "Single Sale" indicator is visible in ADM's product listing views so operators can scan for tagged items.`,
    ].join("\n"),
  },
  {
    storyId: "T03",
    title: "V5 Kiosk: Cart Validation & Enforcement Algorithm",
    description:
      "As a system, I need to validate every add-to-cart action on a V5 kiosk against the configured quantity limit, so that consumers cannot exceed it. " +
      "Validation must run identically for barcode scan, menu tap and search-and-add through one centralized add-to-cart service. Each restricted UPC is evaluated independently. Restriction only applies to V5 devices, never to 365 Dining/RT devices.",
    acceptanceCriteria: [
      `Validation fires on every input method: barcode scan, menu tap, and search-and-add.`,
      `Validation is centralized in a single add-to-cart service so all entry points behave identically.`,
      `Validation adds no noticeable latency to the add-to-cart flow.`,
      `Each restricted UPC is enforced independently of other restricted UPCs in the same cart.`,
      `Non-restricted items are completely unaffected by this feature.`,
      `Cart state resets between transactions (purchase, cancel, or abandoned); a consumer can buy the same restricted item again in a new transaction.`,
      `Adding a "Single Sale" item to an empty cart succeeds with quantity 1.`,
      `Adding units beyond the configured limit for a product already in the cart is rejected.`,
      `A rejected add does not alter the existing cart contents.`,
      `Restrictions apply only to V5 devices, never to 365 Dining/RT devices, even though V5 and RT share the same backend.`,
      `Validation algorithm: check location flag (sfecfg, type=SINGLESALEQTYRESTRICTION) - if 'N', allow normal add. If 'Y', check pricingrec.singlesaleqty - if NULL, allow normal add. If 1-5, compare current cart quantity for that UPC against the limit - allow if below the limit, block if at or above it, and log a blocked event when blocked.`,
    ].join("\n"),
  },
  {
    storyId: "T04",
    title: "V5 Kiosk: Limit Exceeded Modal (UI)",
    description:
      "As a consumer, I want clear feedback when I hit a purchase limit, so that I understand why my item wasn't added. " +
      "The kiosk must immediately show a modal explaining the limit in plain language, with a single way to dismiss it. The modal should only appear on the attempt that exceeds the limit and dismissing it must leave the cart exactly as it was.",
    acceptanceCriteria: [
      `A modal popup appears immediately when a consumer attempts to add a unit that exceeds the configured limit.`,
      `The modal message clearly states the per-transaction limit (e.g., "This item is limited to 1 per transaction").`,
      `The modal includes a single "Ok" button to dismiss it.`,
      `On dismiss, the consumer returns to the prior screen; the cart remains unchanged (blocked item not added, existing items not removed).`,
      `The modal must NOT appear when adding the first (allowed) unit of a restricted item - only when the limit is exceeded.`,
      `The modal appears consistently across all kiosk form factors (V5 and MM6).`,
    ].join("\n"),
  },
  {
    storyId: "T05",
    title: "V5 Kiosk: Visual Indicators",
    description:
      "As a consumer, I want to see which items are restricted before I try to add them, so that I know what to expect at checkout. " +
      "This requires a visual badge or icon wherever the product appears for browsing plus a clear Limit X label once it is in the cart.",
    acceptanceCriteria: [
      `Restricted items show a visual indicator (icon/badge) on the home screen, menu button, and search results.`,
      `The cart shows a "Limit X" label next to restricted items, where X is the configured limit for that product.`,
    ].join("\n"),
  },
  {
    storyId: "T06",
    title: "Blocked Event Capture & Sync",
    description:
      "As an operator, I want every blocked purchase attempt logged, so that I have a complete audit trail of enforcement. " +
      "The kiosk must record the event with full detail and this record must reach both the local kiosk database and the upstream operator-facing database, including after an offline period.",
    acceptanceCriteria: [
      `On each rejected add, the kiosk writes a record to the singlesaleblockedevents table containing: location, transaction ID, timestamp, device, product ID, UPC, input method, transaction status, and consumer account ID.`,
      `The event record is stored in both KSKDB (local) and SOSDB (upstream).`,
      `Events are uploaded to ADM (SOSDB) via the standard sync cycle, similar to sales information - not in real time.`,
      `If the kiosk is offline, events are stored locally and forwarded once connectivity resumes. If online, the event is inserted into both KSKDB and SOSDB together.`,
      `Code changes ensure events are inserted correctly during Sale, Cancel, or Abandoned transaction outcomes.`,
    ].join("\n"),
  },
  {
    storyId: "T07",
    title: "ADM Reporting: Blocked Scan Events Report",
    description:
      "As an operator, I want a report of all blocked scan events, so that I can monitor enforcement and compliance across my locations. " +
      "A new report in ADM under the Transactions section, runnable for a single day or a date range, for one or several locations, schedulable, and exportable to Excel and PDF.",
    acceptanceCriteria: [
      `A new report, "Single Sale Blocked Scan Events," is added under the Transactions section of ADM Reports.`,
      `The report is runnable for a single day or multiple days.`,
      `The report is runnable for a single location or multiple locations.`,
      `The report supports scheduling and export to Excel and PDF.`,
      `Report data is fetched from the singlesaleblockedevents table.`,
      `The report runs in Snowflake by default; a data source manager switch allows toggling between RDS and Snowflake.`,
      `Report columns: Location Name, Trans ID, Trans Date/Time, Device (serial number and type), Product Name, UPC Code, Input Method (BARCODESCAN, MENUTAP, SEARCH, etc.).`,
      `One row per blocked scan event; only transactions where a block was actually triggered are included.`,
      `A Total row aggregates the total number of blocked events in the result set.`,
      `Event records are queryable by date range, location, device type, product/UPC, and org.`,
    ].join("\n"),
  },
  {
    storyId: "T08",
    title: "Transaction Lifecycle & Cart Reset",
    description:
      "As a consumer, I want each new transaction to start completely fresh, so that a prior purchase doesn't block me later. " +
      "Quantity restrictions apply per transaction, not per consumer over time. Once a transaction ends the cart and any restriction counts must fully reset.",
    acceptanceCriteria: [
      `Cart state is fully cleared upon transaction completion (purchase).`,
      `A new transaction starts with a clean slate, excluding restrictions carried over from any prior transaction.`,
      `Cancelling a transaction fully resets the cart.`,
      `Cart abandonment fully resets the cart state.`,
      `The system does not attempt to identify or track consumers across transactions for the purpose of enforcing quantity limits.`,
      `Upon completion of a transaction containing a restricted item, the consumer can start a new transaction and add the same item again.`,
    ].join("\n"),
  },
  {
    storyId: "T09",
    title: "Platform Scope (V5 vs RT vs Mobile Market)",
    description:
      "As a product owner, I want the quantity restriction limited to V5 kiosks only, so that other platforms remain unaffected by this release. " +
      "Restrictions are strictly scoped to the product-location level with no category-level or global-level mechanism.",
    acceptanceCriteria: [
      `Sale quantity restriction enforcement applies only to V5 devices.`,
      `365 Dining/RT devices do NOT enforce the restriction, even though they share the same backend as V5.`,
      `Mobile Market (MM)/Pico platform enforcement is out of scope for this release (deprioritized to future scope).`,
      `There is no category-level or global-level restriction; enforcement exists only at the per-product, per-location level.`,
    ].join("\n"),
  },
  {
    storyId: "T10",
    title: "Edge Cases, Non-Goals & Backward Compatibility",
    description:
      "As QA, I want to confirm the documented non-goals and known limitations behave exactly as specified, so that we don't file false defects against intentional design decisions. " +
      "Several behaviors are intentional limitations rather than defects and need to be verified as designed.",
    acceptanceCriteria: [
      `A consumer can bypass the quantity limit by completing separate, back-to-back transactions; this is an accepted, documented limitation, not a defect.`,
      `Different restricted products at the same location are enforced independently - e.g., a location with 20 different "Single Sale" products still allows one of each to be purchased in the same transaction.`,
      `When a product is removed from a location, its restriction data in the singlesaleblockedevents table is cleaned up rather than retained as unused data.`,
      `Copying a product from one location to another does NOT copy its restriction tag (consistent with how promotions are handled).`,
      `Older/un-migrated kiosk devices that don't recognize the new restriction field continue operating normally; the NULL default ensures no enforcement occurs on those devices.`,
      `The feature has no impact on other cart, promotion, tax, or receipt logic for non-restricted purchases.`,
    ].join("\n"),
  },
  {
    storyId: "T11",
    title: "Config Sync Propagation (ADM to Device)",
    description:
      "As a system, I need restriction configuration saved in ADM to correctly propagate to V5 kiosk devices through the standard sync pipeline, so that enforcement uses up-to-date data. " +
      "The singlesaleqty value must travel from SOSDB pricingrec to KSKDB pricingrec intact, and a kiosk that has not yet synced should behave as if no restriction exists.",
    acceptanceCriteria: [
      `A full sync correctly propagates the singlesaleqty value from SOSDB pricingrec to KSKDB pricingrec for a newly tagged product.`,
      `An incremental sync correctly propagates a change to an existing product's singlesaleqty value (e.g., updated from 1 to 3) from SOSDB to KSKDB.`,
      `An incremental sync correctly propagates an un-tag action (singlesaleqty reverted to NULL) from SOSDB to KSKDB.`,
      `Toggling the location-level sfecfg flag (SINGLESALEQTYRESTRICTION) in ADM is correctly synced to the value read by the kiosk during validation.`,
      `A kiosk that has not yet received a sync after a new tag was saved in ADM does not enforce the restriction (treats the product as unrestricted, since local singlesaleqty is still NULL) until the next successful sync.`,
      `After a successful sync, the kiosk immediately reflects the updated restriction data on the next transaction (no additional restart or manual refresh required).`,
      `Sync of the new singlesaleqty field does not break or corrupt the rest of the existing pricingrec payload/structure for that product.`,
    ].join("\n"),
  },
  {
    storyId: "T12",
    title: "End-to-End Integration Flow",
    description:
      "As QA, I want to validate the complete restriction lifecycle end-to-end, so that I can confirm all individual components work correctly together as one flow. " +
      "Tag a product as restricted in ADM, let it sync to a kiosk, trigger a block at that kiosk, and confirm the resulting event surfaces correctly and completely in the ADM report.",
    acceptanceCriteria: [
      `An operator tags a product as restricted (with a specific quantity limit) for a location and saves the configuration in ADM.`,
      `The restriction configuration syncs successfully to a V5 kiosk assigned to that location.`,
      `A consumer transaction on that kiosk adds the product up to its limit successfully, then a subsequent add attempt is blocked with the correct modal.`,
      `The blocked event is written to KSKDB with all required fields, and successfully syncs to SOSDB during the standard sync cycle.`,
      `The synced event data reaches Snowflake and is queryable there.`,
      `The ADM "Single Sale Blocked Scan Events" report, when run for the relevant date/location, displays this exact blocked event with all correct field values (location, transaction ID, timestamp, device, product name, UPC, input method).`,
      `The full chain completes correctly across at least two different scenarios: (a) a fresh product tagged for the first time, and (b) an existing tagged product whose quantity limit was just changed by the operator.`,
      `No step in the chain silently drops, duplicates, or corrupts data as it moves from ADM to sync to kiosk to event capture to upstream sync to report.`,
    ].join("\n"),
  },
];
