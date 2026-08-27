/**
 * Scenario archetypes (PART 2 "workflow-derived", PART 3 "concrete verb + named
 * object"). An acceptance criterion about a kiosk cart must not be tested with a
 * form edit-save-reload flow, so the step shape is chosen from what the criterion
 * actually describes rather than from a single template.
 *
 * Every action here names a quoted object and every expected result names a
 * concrete observable. `npx tsx server/testcase/audit-steps.ts` proves it.
 */
import type { CoverageType } from "./types.js";

export type Archetype =
  | "CONFIG"      // an ADM setting or toggle on a page
  | "PERMISSION"  // visibility gated by a role
  | "SELECTION"   // a modal that selects items and sets per-item values
  | "KIOSK_CART"  // add-to-cart validation and enforcement on a device
  | "MODAL_UI"    // a popup shown to a consumer
  | "VISUAL"      // badges, icons, labels
  | "LIFECYCLE"   // transaction end and cart reset
  | "EVENT_DB"    // writing an audit or event record to tables
  | "SYNC"        // propagation between databases
  | "REPORT"      // an ADM report
  | "SCOPE"       // platform applicability rules
  | "GENERIC";

export interface ScenarioCtx {
  actor: string;
  screen: string;
  setting: string;
  object: string;
  value: string;
  limit: string;
  product: string;
  table: string;
  secondTable: string;
  endpoint: string;
  device: string;
  location: string;
  report: string;
  button: string;
}

type Pair = [string, string];

const q = (s: string) => `"${s}"`;

export function detectArchetype(acText: string, storyTitle = ""): Archetype {
  const t = `${acText} ${storyTitle}`.toLowerCase();

  // Precedence matters. Earlier, MODAL_UI matched the bare word "modal", so the
  // ADM "Choose Items" tagging modal was tested as the consumer limit modal, and
  // EVENT_DB matched "blocked event" inside the cart-validation algorithm.
  // Each rule below now requires signals specific to its own workflow.

  if (/\bpermission\b|\bhidden entirely\b|\bdoes not have the required\b|\bnot just disabled\b/.test(t)) return "PERMISSION";
  if (/\breport\b|\bexport\b|\bschedul|\btotal row\b|\bsnowflake\b|\brds\b/.test(t)) return "REPORT";

  // The events table is the subject of event capture even when the criterion also
  // mentions the sync cycle that carries it.
  if (/\bsinglesaleblockedevents\b|\bwrites? a record\b|\bstored in both\b|\bkskdb\b.*\bsosdb\b/.test(t)) return "EVENT_DB";
  if (/\bfull sync\b|\bincremental sync\b|\bpropagat|\bkskdb\b|\bsosdb\b|\bsynced\b|\bsync cycle\b|\bsync pipeline\b/.test(t)) return "SYNC";

  // The enforcement algorithm belongs to the cart, not to event capture, even
  // though it ends by logging a blocked event.
  if (/\bvalidation algorithm\b|\bcheck location flag\b|\bsinglesaleqty\b|\badd-to-cart service\b|\binput method\b/.test(t)) return "KIOSK_CART";

  // Item selection and tagging, including the tagging modal and its controls.
  if (/\bchoose items\b|\bcheckbox|\bmulti-select|\bmulti-selection\b|\bquantity dropdown\b|\bfilter dropdown\b|\bsearch input\b|\bun-?tag|\btagged\b|\brestriction tag\b|\bmodal listing\b|\bproducts extended\b/.test(t)) return "SELECTION";

  // The consumer-facing limit modal specifically.
  if (/\bmodal popup\b|\bmodal message\b|\bmodal includes\b|\bok" button\b|\bdismiss\b|\bmodal appears\b|\bmodal must not appear\b|\bform factors\b/.test(t)) return "MODAL_UI";

  if (/\bicon\b|\bbadge\b|\bvisual indicator\b|\blimit x\b|\bindicator is visible\b/.test(t)) return "VISUAL";
  if (/\bcart state\b|\bresets? between transactions\b|\bfully reset\b|\bclean slate\b|\bcart abandonment\b|\bnew transaction\b/.test(t)) return "LIFECYCLE";
  if (/\bv5 device|\brt device|\b365 dining\b|\bmobile market\b|\bpico\b|\bout of scope\b|\bcategory-level\b|\bglobal-level\b/.test(t)) return "SCOPE";
  if (/\bauditable\b|\btimestamped\b|\bblocked event\b|\binserted\b/.test(t)) return "EVENT_DB";
  if (/\badd-to-cart\b|\badd to cart\b|\bcart\b|\bbarcode scan\b|\bmenu tap\b|\bupc\b|\bconsumer\b|\bkiosk\b/.test(t)) return "KIOSK_CART";
  if (/\bdropdown\b|\bfilter\b|\btag\b/.test(t)) return "SELECTION";
  if (/\bsetting\b|\btoggle\b|\byes\/no\b|\bdefault value\b|\bsummary page\b|\bsaved successfully\b|\bcan be saved\b/.test(t)) return "CONFIG";
  return "GENERIC";
}

// ── Positive paths ───────────────────────────────────────────────────────────

function positive(a: Archetype, v: ScenarioCtx): Pair[] {
  switch (a) {
    case "CONFIG":
      return [
        [`Log in to ADM as ${q(v.actor)} and open the ${q(v.screen)} for location ${q(v.location)}`, `The ${q(v.screen)} opens and the Info Section is displayed`],
        [`Locate the ${q(v.setting)} setting in the Info Section of the ${q(v.screen)}`, `The ${q(v.setting)} setting is displayed with its current value visible`],
        [`Set the ${q(v.setting)} setting to ${q(v.value)}`, `The ${q(v.setting)} control displays ${q(v.value)}`],
        [`Click the ${q(v.button)} control on the ${q(v.screen)}`, `A confirmation message "Saved successfully" is displayed and no validation error appears`],
        [`Reload the ${q(v.screen)} for location ${q(v.location)}`, `The ${q(v.setting)} setting still reads ${q(v.value)} after the reload`],
        [`Query the ${q(v.table)} table for location ${q(v.location)}`, `The stored ${q(v.setting)} value in the ${q(v.table)} table is ${q(v.value)}`],
        [`Open the ${q(v.screen)} for a second location that was never changed`, `The ${q(v.setting)} setting at the second location still reads "No", confirming per-location independence`],
      ];

    case "PERMISSION":
      return [
        [`Log in to ADM as ${q(v.actor)} who HAS the required permission and open the ${q(v.screen)}`, `The ${q(v.setting)} control is displayed on the ${q(v.screen)}`],
        [`Log out of ADM and log back in as a user WITHOUT permission for the ${q(v.setting)} control`, `The ADM home page is displayed for the unprivileged user account`],
        [`Open the ${q(v.screen)} for location ${q(v.location)} as the unprivileged user`, `The ${q(v.screen)} loads with no error message`],
        [`Inspect the Info Section of the ${q(v.screen)} for the ${q(v.setting)} control`, `The ${q(v.setting)} control is absent from the page rather than displayed in a disabled state`],
        [`Inspect the rendered page source of the ${q(v.screen)} for the ${q(v.setting)} control`, `No input element for the ${q(v.setting)} control is rendered in the page source`],
        [`Query the ${q(v.table)} table for location ${q(v.location)}`, `The stored ${q(v.setting)} value in the ${q(v.table)} table is unchanged`],
      ];

    case "SELECTION":
      return [
        [`Set the ${q(v.setting)} setting to "Yes" on the ${q(v.screen)} for location ${q(v.location)}`, `The ${q(v.button)} button becomes enabled on the ${q(v.screen)}`],
        [`Click the ${q(v.button)} button on the ${q(v.screen)}`, `A modal opens listing the products extended to location ${q(v.location)}`],
        [`Check the checkbox for product ${q(v.product)} in the modal`, `The row for ${q(v.product)} is selected and its quantity dropdown becomes enabled`],
        [`Inspect the quantity dropdown for ${q(v.product)}`, `The dropdown offers the values 1 through 5 and defaults to 1`],
        [`Select quantity ${q(v.limit)} in the dropdown for ${q(v.product)}`, `The quantity dropdown for ${q(v.product)} displays ${q(v.limit)}`],
        [`Click the "Save" control inside the ${q(v.button)} modal`, `The modal closes and ${q(v.product)} is shown as selected with quantity ${q(v.limit)}, held locally only`],
        [`Query the ${q(v.table)} table for ${q(v.product)} before the page is saved`, `No restriction row for ${q(v.product)} exists yet in the ${q(v.table)} table`],
        [`Click the "Save" control on the ${q(v.screen)}`, `A confirmation message "Saved successfully" is displayed`],
        [`Query the ${q(v.table)} and productlocation tables for ${q(v.product)}`, `The restriction and the quantity ${q(v.limit)} are persisted in both the ${q(v.table)} and productlocation tables`],
        [`Inspect the change timestamp column recorded for ${q(v.product)}`, `A timestamp row for the tagging change is stored and readable`],
        [`Open the ADM product listing view and locate ${q(v.product)}`, `The "Single Sale" indicator is displayed against ${q(v.product)} in the listing`],
      ];

    case "KIOSK_CART":
      return [
        [`Power on the ${q(v.device)} assigned to location ${q(v.location)}`, `The kiosk home screen is displayed and the device reports location ${q(v.location)}`],
        [`Start a new consumer transaction on the ${q(v.device)}`, `An empty cart is displayed with 0 items`],
        [`Add ${q(v.product)} to the cart by barcode scan on the ${q(v.device)}`, `${q(v.product)} is added with quantity 1 and the cart shows 1 item`],
        [`Inspect the cart line for ${q(v.product)}`, `The cart line shows quantity 1 and the "Limit ${v.limit}" label`],
        [`Add a non-restricted control product to the same cart on the ${q(v.device)}`, `The control product is added with no limit label and no modal, so the cart holds 2 lines`],
        [`Query the ${q(v.table)} table for the limit read during validation of ${q(v.product)}`, `The ${q(v.table)} table returns the configured limit ${q(v.limit)} for ${q(v.product)}`],
        [`Start a new transaction and add ${q(v.product)} using the menu tap entry point`, `The same limit of ${v.limit} is enforced from the menu tap entry point`],
        [`Start a new transaction and add ${q(v.product)} using the search-and-add entry point`, `The same limit of ${v.limit} is enforced from the search entry point`],
        [`Measure the response time of the add-to-cart call on the ${q(v.device)}`, `The recorded response time is within the normal baseline with no perceptible delay`],
      ];

    case "MODAL_UI":
      return [
        [`Start a new transaction on the ${q(v.device)} at location ${q(v.location)}`, `An empty cart is displayed with 0 items`],
        [`Add the first allowed unit of ${q(v.product)} to the cart`, `${q(v.product)} is added with quantity 1 and NO modal is displayed`],
        [`Attempt to add one more unit of ${q(v.product)} beyond the limit of ${v.limit}`, `A modal popup is displayed immediately`],
        [`Read the message text displayed in the limit modal on the ${q(v.device)}`, `The modal message states the per-transaction limit, for example "This item is limited to ${v.limit} per transaction"`],
        [`Inspect the controls presented in the limit modal on the ${q(v.device)}`, `The modal presents a single "Ok" button and no other control`],
        [`Click the "Ok" button in the limit modal`, `The modal closes and the prior screen is displayed again`],
        [`Inspect the cart contents on the ${q(v.device)} after the modal is dismissed`, `The cart still holds exactly ${v.limit} of ${q(v.product)}; the blocked unit was not added and no existing line was removed`],
      ];

    case "VISUAL":
      return [
        [`Open the kiosk home screen on the ${q(v.device)} at location ${q(v.location)}`, `The home screen displays the product tiles for location ${q(v.location)}`],
        [`Locate the home screen tile for the restricted product ${q(v.product)}`, `The tile for ${q(v.product)} displays the restriction icon or badge`],
        [`Open the menu button view and locate ${q(v.product)}`, `The menu button entry for ${q(v.product)} displays the same restriction indicator`],
        [`Search for ${q(v.product)} and inspect the search result row`, `The search result row for ${q(v.product)} displays the restriction indicator`],
        [`Add ${q(v.product)} to the cart and inspect the cart line`, `The cart line displays the "Limit ${v.limit}" label matching the configured limit`],
        [`Locate a non-restricted control product in the same three views on the ${q(v.device)}`, `No restriction indicator and no limit label is displayed for the control product`],
      ];

    case "LIFECYCLE":
      return [
        [`Start a transaction on the ${q(v.device)} and add ${q(v.product)} up to its limit of ${v.limit}`, `The cart holds ${v.limit} of ${q(v.product)} and a further add is blocked`],
        [`Complete the purchase on the ${q(v.device)}`, `The sale completes and the cart is cleared to 0 items`],
        [`Start a new transaction on the ${q(v.device)}`, `A new empty cart is displayed with 0 items`],
        [`Add ${q(v.product)} again in the new transaction`, `${q(v.product)} is added with quantity 1, confirming no count carried over`],
        [`Cancel the transaction on the ${q(v.device)}`, `The cart is cleared and the kiosk returns to the idle screen`],
        [`Start another transaction and inspect the cart on the ${q(v.device)}`, `The cart is empty with no restriction count carried from the cancelled transaction`],
        [`Abandon a transaction on the ${q(v.device)} by leaving it idle until timeout`, `The cart state is cleared and no restriction count persists`],
      ];

    case "EVENT_DB":
      return [
        [`Trigger a blocked add of ${q(v.product)} on the ${q(v.device)} at location ${q(v.location)}`, `The add is rejected and the limit modal is displayed`],
        [`Query the ${q(v.table)} table on KSKDB for the newest row`, `One new row exists in the ${q(v.table)} table for the blocked attempt on ${q(v.product)}`],
        [`Inspect the location, transaction ID, and timestamp columns of that ${q(v.table)} row`, `All three columns are populated with the values from the blocked transaction`],
        [`Inspect the device, product ID, and UPC columns of that ${q(v.table)} row`, `The device serial, product ID, and UPC columns match the kiosk and ${q(v.product)}`],
        [`Inspect the input method, transaction status, and consumer account ID columns of that ${q(v.table)} row`, `The input method column records the entry point used, and the status and account columns are populated`],
        [`Run the standard sync cycle and query the ${q(v.table)} table on ${q(v.secondTable)}`, `The same event row is present in ${q(v.secondTable)} with identical column values`],
        [`Disconnect the ${q(v.device)} from the network and trigger another blocked add`, `The event row is written to the local KSKDB ${q(v.table)} table while offline`],
        [`Restore connectivity on the ${q(v.device)} and run the sync cycle`, `The queued offline event row appears in the ${q(v.secondTable)} copy of the ${q(v.table)} table`],
        [`Repeat the blocked add of ${q(v.product)} and end the transaction by cancellation, then by abandonment`, `A row is written to the ${q(v.table)} table for each outcome, covering Sale, Cancel, and Abandoned`],
      ];

    case "SYNC":
      return [
        [`Tag ${q(v.product)} with quantity limit ${q(v.limit)} in ADM and save the ${q(v.screen)}`, `A confirmation message is displayed and the value is persisted on SOSDB`],
        [`Query the ${q(v.table)} table on SOSDB for ${q(v.product)}`, `The singlesaleqty column holds ${q(v.limit)}`],
        [`Run a full sync to the ${q(v.device)} at location ${q(v.location)}`, `The full sync completes with no error logged`],
        [`Query the ${q(v.table)} table on KSKDB for ${q(v.product)}`, `The local singlesaleqty column holds ${q(v.limit)}, matching the SOSDB row`],
        [`Change the limit for ${q(v.product)} in ADM from ${q(v.limit)} to "3" and save`, `The updated value "3" is stored in the SOSDB ${q(v.table)} table`],
        [`Run an incremental sync to the ${q(v.device)}`, `The incremental sync completes and the local singlesaleqty column reads "3"`],
        [`Un-tag ${q(v.product)} in ADM, save, and run an incremental sync`, `The local singlesaleqty column for ${q(v.product)} is reverted to NULL`],
        [`Toggle the location flag ${q(v.setting)} in ADM and run a sync to the ${q(v.device)}`, `The flag value read by the kiosk during validation matches the new state`],
        [`Start a transaction on the ${q(v.device)} immediately after the sync, with no restart`, `The updated limit is enforced on that first transaction, so the over-limit add is rejected without any restart or manual refresh`],
        [`Compare the full ${q(v.table)} row for ${q(v.product)} before and after the sync`, `Every other column in the ${q(v.table)} row is unchanged and uncorrupted`],
      ];

    case "REPORT":
      return [
        [`Log in to ADM as ${q(v.actor)} and open the Reports section`, `The Reports page is displayed`],
        [`Open the "Transactions" section of ADM Reports`, `The "Transactions" section lists its available reports`],
        [`Locate the ${q(v.report)} report under "Transactions"`, `The ${q(v.report)} report is listed under the "Transactions" section`],
        [`Run the ${q(v.report)} report for a single day and a single location`, `The report returns only blocked scan event rows for that day and location`],
        [`Re-run the ${q(v.report)} report for a date range across multiple locations`, `The report returns blocked event rows for every selected day and location`],
        [`Inspect the column headers of the ${q(v.report)} report`, `The report shows the Location Name, Trans ID, Trans Date/Time, Device, Product Name, UPC Code, and Input Method columns`],
        [`Compare the ${q(v.report)} row count against the ${q(v.table)} table for the same filter`, `One row is shown per blocked scan event and no non-blocked transaction row appears`],
        [`Inspect the Total row of the ${q(v.report)} report`, `The Total row states the total number of blocked event rows in the result set`],
        [`Export the ${q(v.report)} report to Excel and then to PDF`, `Both files are downloaded and contain the same rows as the on-screen report`],
        [`Schedule the ${q(v.report)} report and re-open the schedule list`, `The scheduled report is listed with its delivery settings saved`],
        [`Switch the data source manager for the ${q(v.report)} report from Snowflake to RDS and re-run`, `The report returns the same rows from RDS, with Snowflake remaining the default source`],
      ];

    case "SCOPE":
      return [
        [`Tag ${q(v.product)} with limit ${q(v.limit)} for location ${q(v.location)} and sync every device`, `Both devices report a completed sync and the ${q(v.table)} row holds ${q(v.limit)}`],
        [`Start a transaction on the ${q(v.device)} and add ${q(v.product)} beyond its limit`, `The add is rejected on the V5 device and the limit modal is displayed`],
        [`Start a transaction on the 365 Dining/RT device at location ${q(v.location)}`, `An empty cart is displayed on the RT device with 0 items`],
        [`Add ${q(v.product)} beyond the same limit on the 365 Dining/RT device`, `Every add is accepted on the RT device and no modal is displayed, despite the shared backend`],
        [`Query the ${q(v.table)} table for restriction scope rows`, `Restriction rows exist only per product and per location, with no category-level or global-level row`],
        [`Attempt to configure a restriction at category level in the ADM ${q(v.screen)}`, `No category-level or global-level restriction control is displayed`],
      ];

    default:
      // Form/record flow: the safe default when the criterion describes a value
      // being set and stored rather than a device, sync, or report workflow.
      return [
        [`Log in as ${q(v.actor)} and open the ${q(v.screen)}`, `The ${q(v.screen)} loads and the ${q(v.object)} is displayed`],
        [`Locate and open the ${q(v.object)} for editing on the ${q(v.screen)}`, `The ${q(v.object)} opens in edit mode showing its current value`],
        [`Set the ${q(v.object)} to ${q(v.value)}`, `The ${q(v.object)} accepts and displays ${q(v.value)}`],
        [`Click the ${q(v.button)} control on the ${q(v.screen)}`, `A confirmation message "Saved successfully" is displayed and no error appears`],
        [`Query the ${q(v.table)} table for the affected record`, `The stored row in the ${q(v.table)} table holds ${q(v.value)}`],
        [`Reload the ${q(v.screen)} and re-open the ${q(v.object)}`, `The ${q(v.object)} still displays ${q(v.value)} after the reload`],
        [`Inspect the audit entry recorded for the ${q(v.object)} change`, `An audit entry records the new value ${q(v.value)} and the ${q(v.actor)} who set it`],
      ];
  }
}

// ── Negative paths: the criterion's rule is deliberately violated ────────────

function negative(a: Archetype, v: ScenarioCtx): Pair[] {
  switch (a) {
    case "CONFIG":
      return [
        [`Log in to ADM as ${q(v.actor)} and open the ${q(v.screen)} for location ${q(v.location)}`, `The ${q(v.screen)} opens with the Info Section displayed`],
        [`Set the ${q(v.setting)} setting to "Yes" while no products are tagged as restricted`, `The ${q(v.setting)} control displays "Yes"`],
        [`Click the ${q(v.button)} control on the ${q(v.screen)}`, `The page saves and a confirmation message is displayed; no validation error blocks the save`],
        [`Submit an unsupported value for the ${q(v.setting)} setting through the save request`, `The request is rejected with a specific error and the stored value is unchanged`],
        [`Reload the ${q(v.screen)} for location ${q(v.location)}`, `The ${q(v.setting)} setting displays its last valid value, not the rejected input`],
      ];

    case "PERMISSION":
      return [
        [`Log in to ADM as a user WITHOUT permission for the ${q(v.setting)} control`, `The ADM home page is displayed for the unprivileged user account`],
        [`Open the ${q(v.screen)} for location ${q(v.location)} as the unprivileged user`, `The page loads and the ${q(v.setting)} control is not rendered`],
        [`Submit a change to the ${q(v.setting)} setting directly through the save request`, `The request is rejected and the stored ${q(v.setting)} value is unchanged`],
        [`Log back in as ${q(v.actor)} and inspect the ${q(v.setting)} setting`, `The displayed value is exactly what it was before the unauthorised attempt`],
      ];

    case "SELECTION":
      return [
        [`Set the ${q(v.setting)} setting to "No" on the ${q(v.screen)}`, `The ${q(v.button)} button is not displayed on the ${q(v.screen)}`],
        [`Open the ${q(v.button)} modal and inspect the quantity dropdown of an unchecked product row`, `The quantity dropdown is disabled while that product row is unchecked`],
        [`Attempt to set a quantity on the unchecked product row in the ${q(v.button)} modal`, `The quantity value cannot be set and no restriction row is recorded for that product`],
        [`Search the ${q(v.button)} modal for a scancode that does not exist at location ${q(v.location)}`, `The product list shows 0 matching rows and no error is displayed`],
        [`Check ${q(v.product)} and then close the ${q(v.button)} modal without saving`, `The selection is discarded and ${q(v.product)} remains untagged`],
        [`Query the ${q(v.table)} table for ${q(v.product)}`, `No restriction row exists for ${q(v.product)} in the ${q(v.table)} table`],
      ];

    case "KIOSK_CART":
      return [
        [`Start a transaction on the ${q(v.device)} and add ${q(v.product)} up to its limit of ${v.limit}`, `The cart holds ${v.limit} of ${q(v.product)}`],
        [`Inspect and note the exact cart lines and cart total shown on the ${q(v.device)}`, `The cart lines and cart total are captured for later comparison`],
        [`Attempt to add one more unit of ${q(v.product)} beyond the limit`, `The add is rejected and the limit modal is displayed`],
        [`Compare the cart lines on the ${q(v.device)} against the values noted before the blocked attempt`, `The cart is unchanged: the blocked unit was not added and no existing line was removed or altered`],
        [`Query the ${q(v.table)} table for a blocked event row`, `A blocked event row is logged for the rejected attempt`],
        [`Attempt the same over-limit add of ${q(v.product)} using a different entry point`, `The add is rejected identically, confirming the centralized service governs every entry point`],
      ];

    case "MODAL_UI":
      return [
        [`Start a transaction on the ${q(v.device)} and add the first unit of ${q(v.product)}`, `The unit is added and NO modal is displayed for the allowed unit`],
        [`Attempt to add a unit of ${q(v.product)} beyond the limit of ${v.limit}`, `The limit modal is displayed immediately`],
        [`Attempt to dismiss the limit modal by tapping outside it on the ${q(v.device)}`, `The modal remains displayed until the "Ok" button is used`],
        [`Click "Ok" in the limit modal and inspect the cart on the ${q(v.device)}`, `The prior screen is displayed and the cart still holds exactly ${v.limit} of ${q(v.product)}`],
      ];

    case "VISUAL":
      return [
        [`Open the kiosk home screen on the ${q(v.device)} and locate a non-restricted control product`, `No restriction indicator is displayed for the control product tile`],
        [`Add the non-restricted control product to the cart on the ${q(v.device)}`, `The cart line shows no "Limit" label`],
        [`Un-tag ${q(v.product)} in ADM, run a sync, and reopen the kiosk home screen`, `The restriction indicator is no longer displayed on the ${q(v.product)} tile`],
        [`Add the un-tagged ${q(v.product)} to the cart and inspect the cart line`, `No limit label is displayed and repeated adds are accepted`],
      ];

    case "LIFECYCLE":
      return [
        [`Complete a transaction on the ${q(v.device)} containing ${v.limit} of ${q(v.product)}`, `The sale completes and the cart is cleared to 0 items`],
        [`Start a new transaction and add ${q(v.product)} again on the ${q(v.device)}`, `The add is accepted, proving no count was carried across the transaction boundary`],
        [`Inspect the consumer account column of both completed transaction rows on the ${q(v.device)}`, `No shared consumer identity links the two transaction rows for limit enforcement`],
        [`Attempt to reopen the previous cart on the ${q(v.device)} after completion`, `The previous cart is unreachable and its line items were cleared`],
      ];

    case "EVENT_DB":
      return [
        [`Perform a successful, non-blocked add of ${q(v.product)} within its limit of ${v.limit}`, `The item is added and no modal is displayed`],
        [`Query the ${q(v.table)} table for new rows after the allowed add`, `No event row is written to the ${q(v.table)} table for the allowed add`],
        [`Add a non-restricted control product and query the ${q(v.table)} table again`, `The ${q(v.table)} row count is still unchanged, confirming only blocked attempts are recorded`],
        [`Trigger a genuine blocked add of ${q(v.product)} and re-query the ${q(v.table)} table`, `Exactly 1 new row is written for the blocked attempt, not more`],
      ];

    case "SYNC":
      return [
        [`Tag ${q(v.product)} with limit ${q(v.limit)} in ADM and save, without running a sync`, `The value is stored in the SOSDB ${q(v.table)} table only`],
        [`Query the ${q(v.table)} table on KSKDB for ${q(v.product)}`, `The local singlesaleqty column is still NULL`],
        [`Start a transaction on the un-synced ${q(v.device)} and add ${q(v.product)} beyond ${v.limit}`, `Every add is accepted and no modal is displayed, because the local value is NULL`],
        [`Inspect the ${q(v.device)} logs for validation errors after those adds`, `No error or exception is logged by the kiosk`],
        [`Run a sync to the ${q(v.device)} and repeat the over-limit add`, `The add is now rejected, confirming enforcement begins only after a successful sync`],
      ];

    case "REPORT":
      return [
        [`Run the ${q(v.report)} report for a date range containing no blocked events`, `The report returns 0 event rows and the Total row reads 0`],
        [`Run the ${q(v.report)} report for a location the signed-in user is not authorised to view`, `No rows from the unauthorised location are returned`],
        [`Run the ${q(v.report)} report for a day of normal transactions with no blocks`, `0 rows are returned, confirming non-blocked transactions are excluded`],
        [`Inspect the Total row of the empty ${q(v.report)} result`, `The Total row is displayed and reports 0 blocked events`],
      ];

    case "SCOPE":
      return [
        [`Start a transaction on the 365 Dining/RT device at location ${q(v.location)}`, `An empty cart is displayed on the RT device with 0 items`],
        [`Add ${q(v.product)} well beyond its configured limit of ${v.limit} on the RT device`, `Every add is accepted and no modal is displayed on the RT device`],
        [`Query the ${q(v.table)} table for blocked event rows from the RT device`, `No blocked event rows exist for the RT device`],
        [`Repeat the same adds of ${q(v.product)} on a Mobile Market/Pico device`, `Every add is accepted with no modal, matching the documented out-of-scope decision`],
      ];

    default:
      return [
        [`Log in as ${q(v.actor)} and open the ${q(v.screen)}`, `The ${q(v.screen)} loads and the ${q(v.object)} is displayed`],
        [`Enter an invalid value "!!!invalid!!!" into the ${q(v.object)}`, `The ${q(v.object)} displays the invalid entry`],
        [`Click the ${q(v.button)} control on the ${q(v.screen)}`, `A validation error naming the ${q(v.object)} is displayed and the save is refused`],
        [`Query the ${q(v.table)} table for a new record`, `No new row is created in the ${q(v.table)} table`],
        [`Re-open the ${q(v.object)} on the ${q(v.screen)}`, `The ${q(v.object)} still displays its prior value, not the rejected entry`],
      ];
  }
}

// ── Edge paths: boundaries, empties, first-and-last ─────────────────────────

function edge(a: Archetype, v: ScenarioCtx): Pair[] {
  switch (a) {
    case "CONFIG":
    case "PERMISSION":
      return [
        [`Open the ${q(v.screen)} for a newly created location`, `The ${q(v.setting)} setting displays its default value of "No"`],
        [`Toggle the ${q(v.setting)} setting to "Yes" and back to "No" without saving`, `The control reflects each change while the stored value in the ${q(v.table)} table stays "No"`],
        [`Save the ${q(v.screen)} with the ${q(v.setting)} setting on and 0 tagged products`, `The save succeeds with no validation error about missing products`],
        [`Enable the ${q(v.setting)} setting at location ${q(v.location)} only, then check a second location`, `The second location still displays "No", confirming per-location independence`],
      ];

    case "SELECTION":
      return [
        [`Select the minimum quantity 1 for ${q(v.product)} in the ${q(v.button)} modal`, `The dropdown displays 1 and the ${q(v.table)} table stores 1 as the limit`],
        [`Select the maximum quantity 5 for ${q(v.product)} in the ${q(v.button)} modal`, `The dropdown displays 5 and the ${q(v.table)} table stores 5 as the limit`],
        [`Inspect the full list of options in the quantity dropdown for ${q(v.product)}`, `The dropdown offers exactly the values 1 through 5, with nothing above 5 or below 1`],
        [`Set the filter dropdown in the ${q(v.button)} modal to "Selected"`, `Only submitted item rows are listed and a note explaining the remote pagination limit is displayed`],
        [`Set the filter dropdown to "Unselected" and then back to "All"`, `The listed rows update for each filter and "All" is the default state`],
        [`Type a partial product name into the search input of the ${q(v.button)} modal`, `The listed rows filter down as each character is typed`],
        [`Search the ${q(v.button)} modal by the full scancode of ${q(v.product)}`, `The row for ${q(v.product)} is listed by its scancode`],
        [`Un-tag the previously tagged ${q(v.product)} and save the ${q(v.screen)}`, `The restriction row is removed from the ${q(v.table)} table and ${q(v.product)} shows as untagged`],
      ];

    case "KIOSK_CART":
      return [
        [`Add ${q(v.product)} to an empty cart on the ${q(v.device)}`, `The add is accepted with quantity 1`],
        [`Add ${q(v.product)} up to exactly the configured limit of ${v.limit}`, `Every unit up to ${v.limit} is accepted and no modal is displayed`],
        [`Attempt one unit of ${q(v.product)} beyond the limit of ${v.limit}`, `The add at the boundary is rejected and the limit modal is displayed`],
        [`Add a second, different restricted product to the same cart on the ${q(v.device)}`, `The second restricted product is accepted up to its own limit, independently of ${q(v.product)}`],
        [`Set the ${q(v.table)} singlesaleqty column to NULL for a product and add several units`, `Every add is accepted, because a NULL limit means no restriction`],
        [`Set the ${q(v.setting)} location flag to "N" and repeat the over-limit add`, `Every add is accepted with no modal while the location flag is off`],
      ];

    case "MODAL_UI":
      return [
        [`Add exactly ${v.limit} allowed units of ${q(v.product)} on the ${q(v.device)}`, `No modal is displayed at any point up to the limit`],
        [`Attempt the very first over-limit unit of ${q(v.product)}`, `The modal is displayed on that attempt and was not displayed before it`],
        [`Repeat the blocked attempt on ${q(v.product)} three times`, `The modal is displayed each time and the cart lines never change`],
        [`Repeat the whole flow for ${q(v.product)} on an MM6 form factor kiosk`, `The modal is displayed with the same message and a single "Ok" control`],
      ];

    case "VISUAL":
      return [
        [`Configure a limit of 1 for ${q(v.product)}, sync, and inspect the cart line`, `The cart line displays "Limit 1"`],
        [`Configure a limit of 5 for ${q(v.product)}, sync, and inspect the cart line`, `The cart line displays "Limit 5", matching the configured value`],
        [`Search the ${q(v.device)} for a restricted product with a very long name and inspect the result row`, `The restriction indicator remains visible and the result row layout is not broken`],
      ];

    case "LIFECYCLE":
      return [
        [`Complete two back-to-back transactions on the ${q(v.device)} each containing ${q(v.product)}`, `Both transactions complete, which is the documented and accepted bypass limitation`],
        [`Abandon a transaction on the ${q(v.device)} after a block occurred`, `The cart is cleared and the block count is discarded`],
        [`Start a transaction on the ${q(v.device)} immediately after a cancellation`, `The new cart is empty with 0 items and no carried-over restriction count`],
      ];

    case "EVENT_DB":
      return [
        [`Trigger blocked adds of ${q(v.product)} through barcode scan, menu tap, and search-and-add`, `The input method column of each ${q(v.table)} row records the correct entry point`],
        [`Trigger a block on ${q(v.product)} and complete the transaction as a Sale`, `The ${q(v.table)} row is written with the Sale transaction status`],
        [`Trigger a block on ${q(v.product)} and then cancel the transaction`, `The ${q(v.table)} row is written with the Cancel transaction status`],
        [`Trigger a block on ${q(v.product)} and let the transaction be abandoned`, `The ${q(v.table)} row is written with the Abandoned transaction status`],
        [`Trigger blocks for several different restricted products within one transaction on the ${q(v.device)}`, `A separate ${q(v.table)} row is written per blocked product with the correct UPC`],
      ];

    case "SYNC":
      return [
        [`Sync a limit value at the minimum of 1 for ${q(v.product)}`, `The local singlesaleqty column reads 1 after the sync`],
        [`Sync a limit value at the maximum of 5 for ${q(v.product)}`, `The local singlesaleqty column reads 5 after the sync`],
        [`Sync an un-tag of ${q(v.product)} so the value returns to NULL`, `The local singlesaleqty column is NULL and no enforcement occurs`],
        [`Run two syncs to the ${q(v.device)} back to back with no intervening change`, `The second sync is idempotent and the ${q(v.table)} values are identical`],
        [`Inspect an older ${q(v.device)} that does not recognise the singlesaleqty field`, `The device continues operating with no enforcement, because the local value defaults to NULL`],
      ];

    case "REPORT":
      return [
        [`Run the ${q(v.report)} report for the earliest single day that has a blocked event`, `The event rows on the boundary date are included`],
        [`Run the ${q(v.report)} report for a range spanning multiple months`, `Every blocked event row in the range is returned`],
        [`Run the ${q(v.report)} report for all locations at once`, `Rows from every location are returned and the Total row matches the row count`],
        [`Filter the ${q(v.report)} report by device type, then by product UPC, then by org`, `Each filter returns only the matching blocked event rows`],
      ];

    case "SCOPE":
      return [
        [`Configure the restriction for ${q(v.product)} at location ${q(v.location)} only`, `Only that product at that location has a restriction row in the ${q(v.table)} table`],
        [`Add a different product at location ${q(v.location)} beyond ${v.limit} units`, `Every add is accepted, confirming the restriction is scoped per product`],
        [`Add ${q(v.product)} beyond ${v.limit} units at a different location`, `Every add is accepted there, confirming the restriction is scoped per location`],
      ];

    default:
      return [
        [`Set the ${q(v.object)} to its minimum supported value`, `The minimum value is accepted and stored in the ${q(v.table)} table`],
        [`Set the ${q(v.object)} to its maximum supported value`, `The maximum value is accepted and stored in the ${q(v.table)} table`],
        [`Enter a value one step beyond the maximum into the ${q(v.object)}`, `A specific error is displayed and the value is refused`],
        [`Submit an empty value for the ${q(v.object)}`, `A "required value" error is displayed for the ${q(v.object)}`],
        [`Enter a value with leading and trailing whitespace into the ${q(v.object)}`, `The stored ${q(v.object)} value has the surrounding whitespace removed`],
      ];
  }
}

export function scenarioSteps(a: Archetype, cov: CoverageType, v: ScenarioCtx): Pair[] {
  if (cov === "negative") return negative(a, v);
  if (cov === "edge") return edge(a, v);
  return positive(a, v);
}

/** Preconditions naming a specific role, record, and state (PART 4.5 / G10). */
export function scenarioPreconditions(a: Archetype, v: ScenarioCtx): string[] {
  switch (a) {
    case "CONFIG":
    case "PERMISSION":
      return [
        `${v.actor} has an ADM account for the org that owns location ${q(v.location)}`,
        `Location ${q(v.location)} exists and its ${q(v.screen)} is reachable`,
        `The ${q(v.setting)} setting is at its default of "No" before the test begins`,
      ];
    case "SELECTION":
      return [
        `${v.actor} has ADM permission to edit location ${q(v.location)}`,
        `The ${q(v.setting)} setting is "Yes" for location ${q(v.location)}`,
        `Product ${q(v.product)} is extended to location ${q(v.location)} and is currently untagged`,
      ];
    case "KIOSK_CART":
    case "MODAL_UI":
    case "VISUAL":
    case "LIFECYCLE":
      return [
        `${q(v.device)} is provisioned to location ${q(v.location)} and has completed a successful sync`,
        `Product ${q(v.product)} is tagged with a quantity limit of ${v.limit} at location ${q(v.location)}`,
        `A non-restricted control product is also available at location ${q(v.location)}`,
      ];
    case "EVENT_DB":
      return [
        `${q(v.device)} at location ${q(v.location)} enforces a limit of ${v.limit} on ${q(v.product)}`,
        `The ${q(v.table)} table is reachable on both KSKDB and ${q(v.secondTable)}`,
        `The row count of the ${q(v.table)} table is recorded before the test begins`,
      ];
    case "SYNC":
      return [
        `${v.actor} can save restriction configuration in ADM for location ${q(v.location)}`,
        `${q(v.device)} at location ${q(v.location)} is online and syncing on the standard schedule`,
        `Product ${q(v.product)} has a NULL singlesaleqty in the KSKDB ${q(v.table)} table before the test`,
      ];
    case "REPORT":
      return [
        `${v.actor} has ADM permission to run reports for location ${q(v.location)}`,
        `At least one blocked event row exists in the ${q(v.table)} table for location ${q(v.location)} on a known date`,
        `The data source manager is set to Snowflake, the default`,
      ];
    case "SCOPE":
      return [
        `Location ${q(v.location)} has both a ${q(v.device)} and a 365 Dining/RT device provisioned`,
        `Product ${q(v.product)} is tagged with a limit of ${v.limit} at location ${q(v.location)}`,
        `Both devices have completed a successful sync`,
      ];
    default:
      return [
        `${v.actor} has access to the ${q(v.screen)} for location ${q(v.location)}`,
        `A ${q(v.object)} record exists in a known starting state`,
      ];
  }
}
