# QA Heatmap (Satellite View)

This document outlines the manual verification steps for the Global Heatmap Dashboard (Satellite View).

## Visual Thresholds
1.  **Navigate to `/app/dashboard`**.
2.  **Verify Color Coding:**
    *   **Green:** Ensure markets with 100% completion (or 0 mandatory tasks) have a green background score.
    *   **Yellow:** Ensure markets with 80% - 99% completion have a yellow background score.
    *   **Red:** Ensure markets with < 80% completion have a red background score.
3.  **Verify Edge Cases:**
    *   Markets with 0 templates deployed should show empty cells or dashes.
    *   Markets with 0 strategies should appear in the list but with empty scores.

## Responsive Behavior
1.  **Desktop View (>768px):**
    *   Verify the view is a **Matrix Table**.
    *   Ensure horizontal scrolling is available if there are many templates.
2.  **Mobile View (<768px):**
    *   Resize browser window to mobile width.
    *   Verify the view transforms into a **Repeater Card List** (vertical layout).
    *   Ensure no horizontal scrolling on the page body.
    *   Expand a card to see the scores.

## Navigation
1.  **Click on a Score Cell:**
    *   Verify it navigates to `/app/[marketId]/board`.
2.  **Click on a Market Name:**
    *   Verify it navigates to `/app/[marketId]/board`.
