# Operators System Improvements Plan

## Overview
This plan addresses three issues identified during testing:
1. Event closing without vote exhaustion requirement
2. Stake amount calculation fix
3. Roles and bios fields for AI topic generation (future)

---

## Issue 1: Event Closing & Vote Penalty System

### Current Behavior
- Events cannot be closed until all checked-in attendees have used all 10 votes
- This blocks event closure even when CO announces closing time

### Required Changes

#### 1.1 Remove Vote Exhaustion Requirement
**File:** `api/operators/events/[id]/close.js`

**Changes:**
- Remove the validation that checks `check_vote_exhaustion()` function
- Allow events to be closed regardless of vote usage
- Keep all other validations (event state, permissions, etc.)

#### 1.2 Add Penalty for Unused Votes
**Logic:**
- When an event is closed, check each checked-in attendee's remaining votes
- If any attendee has unused votes (votes_used < 10), record ONE penalty offense
- **Important:** Only ONE yellow card per event, regardless of how many votes were unused
- Penalty is applied immediately when event closes (no grace period)
- This should happen automatically when event closes

**Implementation Steps:**

1. **Database Function (if needed):**
   - Create or update function to check for unused votes on event close
   - Record offense automatically for each attendee with unused votes

2. **Update Close Event Endpoint:**
   - After closing event, query all checked-in attendees
   - For each attendee with `votes_used < 10`:
     - Record ONE offense in `operators_offenses` table (regardless of vote count)
     - Type: `unused_votes`
     - Description: `"Failed to use all votes at [Event Title]"`
     - This will trigger card status update via existing offense logic
     - **Note:** Check if attendee already has an offense for this event to prevent duplicates

3. **Offense Recording:**
   - Use existing `api/operators/offenses/record.js` logic or create inline
   - Ensure card status is updated (yellow card for first offense)
   - Ensure only one offense per attendee per event

**Files to Modify:**
- `api/operators/events/[id]/close.js` - Remove vote exhaustion check, add penalty logic
- Potentially `database/operators_schema.sql` - If new function needed

---

## Issue 2: Stake Amount Calculation

### Current Behavior
- May 19 event shows $120 stake amount
- With 20 attendees, should show either $1,200 or $2,400 total

### Required Calculation
**Clarification from User:**
- Stake is the amount put on the table per attendee ($120)
- Total stake collected: `stake_amount × confirmed_attendees` = $120 × 20 = $2,400
- Pot (net after Host and AO get paid): `(stake_amount × confirmed_attendees) / 2` = $1,200
- Sponsor pot value: Set when event is created (e.g., $150)
- **Final pot:** `(stake_amount × confirmed_attendees) / 2 + sponsor_pot_value` = $1,200 + $150 = $1,350
- **Note:** `sponsor_pot_value` is a field on the event that's set during event creation/setup

### Required Changes

#### 2.1 Display Total Pot Value
**Files to Check:**
- `src/pages/operators/EventDetail.jsx` - Event detail display
- `src/pages/operators/Dashboard.jsx` - Event cards
- `src/pages/operators/Events.jsx` - Event list
- `api/operators/events/[id]/index.js` - Event detail API

**Changes:**
- Calculate and display: `total_pot = (stake_amount * confirmed_attendees) / 2 + sponsor_pot_value`
- Show:
  - Individual stake: `$120 per attendee`
  - Total stake collected: `$2,400 (20 attendees × $120)`
  - Pot breakdown: `$1,200 (net after Host/AO) + $150 (sponsor contribution) = $1,350 total pot`
  - **Note:** Sponsor pot value is set when event is created, so it's already in the event data

#### 2.2 Update API Responses
**File:** `api/operators/events/[id]/index.js`

**Add to response:**
```javascript
{
  // ... existing fields
  total_stake_collected: stake_amount * confirmed_count,
  total_pot: (stake_amount * confirmed_count) / 2 + (sponsor_pot_value || 0),
  stake_per_attendee: stake_amount,
  confirmed_attendees: confirmed_count,
  sponsor_pot_value: sponsor_pot_value || 0  // Already on event, just include in response
}
```

**Note:** `sponsor_pot_value` is already stored on the event when it's created. We just need to include it in the calculation and display.

**Files to Modify:**
- `api/operators/events/[id]/index.js` - Add total_pot calculation
- `api/operators/events/index.js` - Add total_pot for list view
- `src/pages/operators/EventDetail.jsx` - Display total pot
- `src/pages/operators/Dashboard.jsx` - Display total pot in event cards
- `src/pages/operators/Events.jsx` - Display total pot in event list

---

## Issue 3: Roles and Bios for AI Topic Generation

### Status
**PENDING** - Waiting for ChatGPT prompt from user

### Future Requirements
- Add `role` field to `operators_users` table
- Add `bio` field to `operators_users` table
- Add `role` field to `operators_candidates` table
- Add `bio` field to `operators_candidates` table
- Update forms to collect this information
- Create AI topic generation endpoint that uses roles and bios

### Files That Will Need Updates (Future)
- `database/operators_schema.sql` - Add columns
- `api/operators/candidates/submit.js` - Collect role/bio
- `api/operators/users/[email]/promote.js` - Update role/bio
- `src/pages/operators/CreateEvent.jsx` - Display AI-generated topics
- `src/pages/operators/Candidates.jsx` - Show role/bio
- `src/pages/operators/Admin.jsx` - Show role/bio
- New: `api/operators/events/[id]/generate-topics.js` - AI topic generation

---

## Implementation Order

1. **Issue 2 (Stake Calculation)** - Quick fix, no business logic changes
2. **Issue 1 (Event Closing & Penalties)** - Requires careful testing of penalty system
3. **Issue 3 (Roles/Bios)** - Wait for user's ChatGPT prompt

---

## Testing Checklist

### Issue 1 Testing
- [ ] Close event with some attendees having unused votes
- [ ] Verify event closes successfully (no vote exhaustion requirement)
- [ ] Verify attendees with unused votes receive ONE yellow card (regardless of vote count)
- [ ] Verify card status updates correctly in user profile
- [ ] Verify penalty appears in offenses table
- [ ] Verify only ONE offense per attendee per event (even if they have many unused votes)
- [ ] Test with multiple attendees having different vote usage
- [ ] Verify penalty is applied immediately upon event close

### Issue 2 Testing
- [ ] Verify total stake calculation: `stake_amount × confirmed_attendees`
- [ ] Verify pot calculation: `(stake_amount × confirmed_attendees) / 2 + sponsor_pot`
- [ ] Verify display on Event Detail page (show stake, total stake, and pot)
- [ ] Verify display on Dashboard event cards
- [ ] Verify display on Events list page
- [ ] Test with different attendee counts
- [ ] Test with and without sponsor pot value
- [ ] Example: 20 attendees × $120 = $2,400 stake, $1,200 pot (before sponsor)

### Issue 3 Testing
- [ ] (Pending user prompt)

---

## User Clarifications (Answered)

1. **Stake Calculation:** 
   - Total stake collected: `stake_amount × confirmed_attendees` = $2,400
   - Pot (net after Host/AO): `(stake_amount × confirmed_attendees) / 2` = $1,200
   - Final pot: `pot + sponsor_pot_value` = $1,350

2. **Penalty Timing:** 
   - ✅ Apply penalty immediately when event closes (no grace period)

3. **Penalty Details:** 
   - ✅ Only ONE yellow card per event, regardless of how many votes were unused
