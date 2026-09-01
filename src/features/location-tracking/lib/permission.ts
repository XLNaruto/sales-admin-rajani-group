/**
 * The one permission code behind both Location Tracking screens.
 *
 * This panel's general rule is that a `:list` code drives the sidebar. This
 * feature is an exception and follows the `live-day:read` precedent: the `:read`
 * code IS the menu grant. **There is no `sales-incharge-location:list`** — do
 * not look for one.
 *
 * One code covers the fleet map and the trail; there is no separate grant for
 * the trail. It is granted per-role under the group `sales-incharge-location`
 * ("Location Tracking", single action "View") and is *not* a baseline grant, so
 * plenty of users will not hold it. A user can hold `live-day:read` without this
 * one and vice versa, so the two menus are gated independently.
 */
export const LOCATION_TRACKING_PERMISSION = 'sales-incharge-location:read'
