# MPGS (Seylan Bank) Payment Gateway Integration Guide

## Overview

Replace Paddle with Mastercard Payment Gateway Services (MPGS) via Seylan Bank for subscription payments.

**Gateway:** Mastercard Payment Gateway Services (MPGS) — Seylan Bank  
**Integration Method:** Hosted Session (custom UI with secure iframes)  
**Test Gateway URL:** `https://test-seylan.mtf.gateway.mastercard.com`

---

## 1. Prerequisites

### 1.1 Credentials Needed

| Credential | Where to Find It | Purpose |
|-----------|------------------|---------|
| **Merchant ID** | From Seylan Bank | Identifies your merchant account (test IDs have `TEST` prefix, e.g., `TESTMERCHANT`) |
| **API Password** | Merchant Portal → Admin → Integration Settings | Basic Auth for all server-side API calls |
| **Webhook Secret** | Merchant Portal → Admin → Webhook Notifications | Verifies webhook notifications (auto-generated, 32 chars) |
| **Login credentials** (Operator ID + Password) | From Seylan Bank | Logging into the Merchant Admin portal |

> **Important:** The API Password is **different** from your portal login password. Generate it in the merchant portal under *Admin > Integration Settings*.

### 1.2 API Configuration

| Parameter | Value (Test) |
|-----------|-------------|
| **API Base URL** | `https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/{merchantId}/` |
| **Session.js URL** | `https://test-seylan.mtf.gateway.mastercard.com/form/version/100/merchant/{MERCHANTID}/session.js` |
| **Debug Session.js URL** | `https://test-seylan.mtf.gateway.mastercard.com/form/version/100/merchant/{MERCHANTID}/session.js?debug=true` |
| **Checkout.js URL** | `https://test-seylan.mtf.gateway.mastercard.com/checkout/version/100/checkout.js` |
| **API Version** | `100` (supports v18+) |
| **Authentication** | Basic HTTP Auth: username `merchant.{merchantId}`, password `{apiPassword}` |

---

## 2. Architecture

### 2.1 Payment Flow Diagram

```
React Frontend                        Supabase Edge Function                   MPGS Gateway
    |                                       |                                       |
    |  1. User clicks "Subscribe"           |                                       |
    |-------------------------------------->|                                       |
    |                                       |  2. POST /session (Create Session)     |
    |                                       |-------------------------------------->|
    |                                       |  3. Response: session.id              |
    |                                       |<--------------------------------------|
    |  4. Return session.id                 |                                       |
    |<--------------------------------------|                                       |
    |                                       |                                       |
    |  5. Load session.js from MPGS CDN     |                                       |
    |  6. PaymentSession.configure()        |                                       |
    |  7. User fills card in hosted iframes |                                       |
    |  8. PaymentSession.updateSessionFromForm('card')                              |
    |----------------------------------------------------------------------> MPGS  |
    |  9. Callback: formSessionUpdate(session data)                                 |
    |<---------------------------------------------------------------------- MPGS  |
    |                                       |                                       |
    | 10. Send session.id to edge fn        |                                       |
    |-------------------------------------->|                                       |
    |                                       | 11. PUT /order/{id}/transaction/{id}  |
    |                                       |     (PAY operation with session.id)    |
    |                                       |-------------------------------------->|
    |                                       | 12. Response: result, gatewayCode     |
    |                                       |<--------------------------------------|
    |                                       | 13. PUT /token/{id} (tokenize card)   |
    |                                       |-------------------------------------->|
    |                                       | 14. Token saved for future recurring  |
    |                                       |<--------------------------------------|
    |                                       | 15. Upsert subscription in DB         |
    | 16. Payment result                    |                                       |
    |<--------------------------------------|                                       |
```

### 2.2 Directory Structure (New/Modified Files)

```
.env                                          [MODIFY]  Add MPGS env vars
src/
  services/
    paddle.ts                                 [DELETE]  Replaced by mpgs.ts
    subscriptionService.ts                     [MODIFY]  Replace Paddle with MPGS
    mpgs.ts                                   [CREATE]  MPGS Session.js SDK wrapper
    mpgsService.ts                            [CREATE]  MPGS business logic
  components/
    PricingPage.tsx                            [MODIFY]  Replace Paddle checkout
    MpgsCheckoutForm.tsx                      [CREATE]  Hosted card fields component
  types.ts                                    [MODIFY]  Update subscription types
  index.tsx                                   [MODIFY]  Remove initializePaddle()
index.html                                    [MODIFY]  Remove Paddle.js CDN
supabase/
  functions/
    paddle-webhook/                           [DELETE]  Replaced by mpgs-webhook
    mpgs-payment/
      index.ts                               [CREATE]  Payment edge function
    mpgs-webhook/
      index.ts                               [CREATE]  Webhook edge function
  migrations/
    YYYYMMDD_mpgs_subscriptions.sql           [CREATE]  DB migration
mpgs-seylan-integration-guide.md             [CREATE]  This file
```

---

## 3. Database Migration

### 3.1 Schema Changes

Remove Paddle columns, add MPGS columns to `subscriptions` table.

```sql
-- Drop Paddle columns
ALTER TABLE subscriptions
DROP COLUMN IF EXISTS paddle_subscription_id,
DROP COLUMN IF EXISTS paddle_customer_id;

-- Add MPGS columns
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS mpgs_card_token TEXT,
ADD COLUMN IF NOT EXISTS mpgs_agreement_id TEXT,
ADD COLUMN IF NOT EXISTS mpgs_order_id TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_mpgs_agreement_id ON subscriptions(mpgs_agreement_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mpgs_card_token ON subscriptions(mpgs_card_token);
```

### 3.2 Updated `UserSubscription` TypeScript Interface

```typescript
export interface UserSubscription {
  id?: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'suspended';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  mpgs_card_token?: string;       // Tokenized card for recurring billing
  mpgs_agreement_id?: string;     // Agreement ID for recurring series
  mpgs_order_id?: string;         // Last order ID used
  created_at?: string;
  updated_at?: string;
}
```

---

## 4. Environment Variables

Add to `.env`:

```env
# MPGS (Seylan Bank) - Payment Gateway
MPGS_MERCHANT_ID=your_merchant_id_here
MPGS_API_PASSWORD=your_api_password_here
VITE_MPGS_GATEWAY_URL=https://test-seylan.mtf.gateway.mastercard.com
VITE_MPGS_API_VERSION=100
MPGS_WEBHOOK_SECRET=generated_in_merchant_portal
```

For Supabase Edge Functions, these are set via the Supabase dashboard (Function secrets).

---

## 5. Supabase Edge Functions

### 5.1 `mpgs-payment` Edge Function

Handles all server-side MPGS API calls. Endpoints exposed as POST routes:

#### POST `/create-session`
Creates an MPGS payment session.

**Request to MPGS:**
```http
POST https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/{merchantId}/session
Authorization: Basic base64(merchant.{merchantId}:{apiPassword})
Content-Type: application/json

{
  "session": {
    "authenticationLimit": 25
  }
}
```

**Response from MPGS:**
```json
{
  "merchant": "TESTMERCHANT",
  "result": "SUCCESS",
  "session": {
    "id": "SESSION000218450948092491657986",
    "updateStatus": "SUCCESS",
    "version": "0bd6923c01"
  }
}
```

#### POST `/create-order`
Creates an order and updates session with order details.

**Request to MPGS:**
```http
PUT https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/{merchantId}/session/{sessionId}
Authorization: Basic base64(merchant.{merchantId}:{apiPassword})

{
  "order": {
    "amount": 2900,
    "currency": "USD"
  }
}
```

#### POST `/pay`
Processes payment using the session.

**Request to MPGS:**
```http
PUT https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/{merchantId}/order/{orderId}/transaction/{transactionId}
Authorization: Basic base64(merchant.{merchantId}:{apiPassword})

{
  "apiOperation": "PAY",
  "session": {
    "id": "SESSION_ID"
  },
  "sourceOfFunds": {
    "type": "CARD"
  },
  "order": {
    "amount": 2900,
    "currency": "USD",
    "reference": "order_ref_123"
  },
  "transaction": {
    "reference": "txn_ref_123",
    "source": "INTERNET"
  },
  "sourceOfFunds": {
    "provided": {
      "card": {
        "storedOnFile": "TO_BE_STORED"
      }
    }
  },
  "agreement": {
    "id": "agreement_userid_123",
    "type": "RECURRING",
    "amountVariability": "FIXED",
    "expiryDate": "2028-12-31"
  }
}
```

#### POST `/tokenize`
Creates a card token from the session for future recurring charges.

```http
PUT https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/{merchantId}/token/{tokenId}
Authorization: Basic base64(merchant.{merchantId}:{apiPassword})

{
  "session": {
    "id": "SESSION_ID"
  },
  "sourceOfFunds": {
    "type": "CARD"
  }
}
```

**Response:**
```json
{
  "result": "SUCCESS",
  "token": "51234581xxxx008",
  "tokenExpiry": {
    "month": "12",
    "year": "2028"
  }
}
```

#### POST `/retrieve-order`
Gets order result after payment.

```http
GET https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/{merchantId}/order/{orderId}
```

### 5.2 `mpgs-webhook` Edge Function

Receives async notifications from MPGS. Configurable in Merchant Admin Portal:
- URL: `https://{project}.supabase.co/functions/v1/mpgs-webhook`
- Notification Secret: auto-generated by portal (Admin > Webhook Notifications)

**Webhook payload format (REST-JSON):**
```json
{
  "order": {
    "id": "ORDER_ID",
    "amount": 2900,
    "currency": "USD",
    "status": "CAPTURED"
  },
  "transaction": {
    "id": "TXN_ID",
    "type": "PAY",
    "status": "SUCCESS",
    "gatewayCode": "APPROVED",
    "acquirerCode": "00"
  },
  "merchant": "TESTMERCHANT",
  "result": "SUCCESS",
  "timeOfRecord": "2026-06-01T12:00:00Z"
}
```

**Headers:**
- `X-Notification-Secret`: The 32-char secret (verify this)
- `X-Notification-ID`: Unique notification ID
- `X-Notification-Attempt`: Attempt number

**Verification:** Compare `X-Notification-Secret` header against configured `MPGS_WEBHOOK_SECRET`.

**Actions on receipt:**
- Parse order and transaction status
- If `result === "SUCCESS"` and `gatewayCode === "APPROVED"`:
  - Upsert subscription record for the user
  - Set `status = 'active'`
  - Store transaction reference
- Log for reconciliation

**Retry policy:** Up to 20 attempts over 3 days (intervals: 10s, 30s, 2min, 5min, 30min, 4h×4, 8h, 12h×4). Respond with HTTP 2xx within 2 seconds.

---

## 6. Frontend Implementation

### 6.1 `src/services/mpgs.ts` — Session.js SDK Wrapper

Handles loading and interacting with the MPGS Hosted Session library.

**Key responsibilities:**
- Dynamically load `session.js` script from MPGS CDN (`?debug=true` for testing)
- Provide `configureMpgsSession()` wrapper around `PaymentSession.configure()`
- Provide `updateSessionFromForm()` wrapper
- Handle all callbacks: `initialized`, `formSessionUpdate`
- Expose styling functions: `setFocusStyle`, `setHoverStyle`, `setPlaceholderStyle`
- Dispatch custom events for other components to listen to

**Load script:**
```html
<script src="https://test-seylan.mtf.gateway.mastercard.com/form/version/100/merchant/{MERCHANTID}/session.js"></script>
```
For testing with debug logging:
```html
<script src="https://test-seylan.mtf.gateway.mastercard.com/form/version/100/merchant/{MERCHANTID}/session.js?debug=true"></script>
```

**Configure (once script is loaded):**
```javascript
PaymentSession.configure({
  session: "SESSION_ID",
  fields: {
    card: {
      number: "#card-number",
      securityCode: "#security-code",
      expiryMonth: "#expiry-month",    // can be <select> dropdown
      expiryYear: "#expiry-year",      // can be <select> dropdown
      nameOnCard: "#cardholder-name"
    }
  },
  frameEmbeddingMitigation: ["javascript"],
  locale: "en",       // supported: de_DE, el_GR, en_US, es_MX, es_ES, fr_CA, fr_FR, it_IT, ja_JA, pl_PL, pt_BR, ro_RO, zh_CN
  callbacks: {
    initialized: function(response) {
      if (response.status === "ok") {
        // Hosted fields ready
      }
    },
    formSessionUpdate: function(response) {
      if (response.status === "ok") {
        // Session has card data
        const sessionId = response.session.id;
        const cardScheme = response.sourceOfFunds.provided.card.scheme;
        // Proceed to call edge function PAY
      } else if (response.status === "fields_in_error") {
        // Show validation errors per field
      } else if (response.status === "request_timeout" || response.status === "system_error") {
        // Retry
      }
    }
  },
  interaction: {
    displayControl: {
      formatCard: "EMBOSSED",       // or "FLAT"
      invalidFieldCharacters: "REJECT"  // or "ALLOW" (accessibility)
    }
  }
});
```

**Submit card data:**
```javascript
PaymentSession.updateSessionFromForm('card');
```

### 6.2 `src/components/MpgsCheckoutForm.tsx` — Checkout Form

React component with hosted card fields. Key points:

- Renders readonly input fields for card number, expiry, CVV, cardholder name
- Fields are replaced by MPGS-hosted iframes automatically
- Anti-clickjacking protection (frame-breaker JavaScript)
- Supports `<select>` dropdowns for expiry month/year
- Shows validation errors from `formSessionUpdate` callback
- CTA button triggers `updateSessionFromForm('card')`

**Full HTML structure (from official docs):**
```html
<!-- Anti-clickjack -->
<style id="antiClickjack">body{display:none !important;}</style>
<script>
  if (self === top) {
    document.getElementById("antiClickjack").remove();
  } else {
    top.location = self.location;
  }
</script>

<!-- Card fields (all readonly, no name attr) -->
<div>
  <input type="text" id="card-number" class="input-field"
         title="card number" aria-label="enter your card number" readonly>
</div>
<div>
  <input type="text" id="expiry-month" class="input-field"
         title="expiry month" aria-label="two digit expiry month" readonly>
</div>
<div>
  <input type="text" id="expiry-year" class="input-field"
         title="expiry year" aria-label="two digit expiry year" readonly>
</div>
<div>
  <input type="text" id="security-code" class="input-field"
         title="security code" aria-label="three digit CVV" readonly>
</div>
<div>
  <input type="text" id="cardholder-name" class="input-field"
         title="cardholder name" aria-label="enter name on card" readonly>
</div>
<button id="payButton" onclick="pay()">Subscribe to Pro — $29/mo</button>
```

**Dropdown alternative for expiry (from official docs):**
```html
<div>Expiry Month:
  <select id="expiry-month" class="form-control" readonly>
    <option value="">Select Month</option>
    <option value="01">January</option>
    <option value="02">February</option>
    <option value="03">March</option>
    <option value="04">April</option>
    <option value="05">May</option>
    <option value="06">June</option>
    <option value="07">July</option>
    <option value="08">August</option>
    <option value="09">September</option>
    <option value="10">October</option>
    <option value="11">November</option>
    <option value="12">December</option>
  </select>
</div>
<div>Expiry Year:
  <select id="expiry-year" class="form-control" readonly>
    <option value="">Select Year</option>
    <option>26</option><option>27</option>...<option>39</option>
  </select>
</div>
```

**React implementation approach:**
- Create a container `<div ref={containerRef}>`
- On mount, dynamically insert the frame-breaker script
- Insert the hosted field HTML into the container
- Load `session.js` dynamically
- Call `PaymentSession.configure()` once script loads
- On unmount, clean up

### 6.3 `src/services/mpgs.ts` — Full SDK API Surface

All functions and callbacks available from Session.js v100:

**Configuration functions:**
| Function | Description |
|----------|-------------|
| `PaymentSession.configure(config)` | Attach hosted fields, configure session & callbacks |
| `PaymentSession.updateSessionFromForm(paymentType)` | Submit card data ('card', 'giftCard', 'ach') |
| `PaymentSession.updateSessionFromForm(paymentType, localCardBrand)` | Submit with card brand override |
| `PaymentSession.validate(paymentType, callback)` | Validate fields without submitting to session |
| `PaymentSession.setFocus(selector)` | Programmatically focus a field (e.g., 'card.number') |
| `PaymentSession.setFocusStyle(selectors, styles)` | CSS styles when field has focus |
| `PaymentSession.setHoverStyle(selectors, styles)` | CSS styles on mouse hover |
| `PaymentSession.setPlaceholderStyle(selectors, styles)` | CSS styles for placeholder text |
| `PaymentSession.setPlaceholderShownStyle(selectors, styles)` | CSS styles when placeholder is visible |
| `PaymentSession.setMessage(selector, message)` | Set hidden label / error for assistive tech |
| `PaymentSession.setLocale(locale)` | Change language after initialization |

**Callback registration** (call before `configure()`):
| Callback | Trigger |
|----------|---------|
| `PaymentSession.onFocus(selectors, fn)` | Field gains focus |
| `PaymentSession.onBlur(selectors, fn)` | Field loses focus |
| `PaymentSession.onChange(selectors, fn)` | Input value changes |
| `PaymentSession.onMouseOver(selectors, fn)` | Mouse enters field |
| `PaymentSession.onMouseOut(selectors, fn)` | Mouse leaves field |
| `PaymentSession.onCardBINChange(selectors, fn)` | Card BIN detected/changed |
| `PaymentSession.onCardTypeChange(selectors, fn)` | Card scheme detected/changed |
| `PaymentSession.onEmptinessChange(selectors, fn)` | Field becomes empty/non-empty |
| `PaymentSession.onValidityChange(selectors, fn)` | Real-time validation result change |

**Styling example (from official docs):**
```javascript
PaymentSession.setFocus('card.number');

PaymentSession.setFocusStyle(["card.number","card.securityCode"], {
  borderColor: 'red',
  borderWidth: '3px'
});

PaymentSession.setHoverStyle(["card.number","card.securityCode"], {
  borderColor: 'red',
  borderWidth: '3px'
});

PaymentSession.setPlaceholderStyle(["card.number", "card.nameOnCard"], {
  color: 'blue',
  fontWeight: 'bold',
  textDecoration: 'underline'
});
```

### 6.4 `src/services/mpgsService.ts` — Business Logic

Flow:
1. Call edge function `create-session` → get `session.id`
2. Call edge function `create-order` → update session with amount/currency
3. Dynamically load `session.js` into DOM
4. Configure `PaymentSession.configure()` with session ID
5. On `initialized` callback → enable pay button
6. User fills card details in hosted iframes
7. User clicks "Subscribe" → `PaymentSession.updateSessionFromForm('card')`
8. On `formSessionUpdate` callback with `status === "ok"`:
   - Call edge function `pay` with `session.id`
   - Call edge function `tokenize` → save card token
   - Update subscription in DB
9. On `fields_in_error` → display validation messages
10. On system_error/timeout → retry option

### 6.5 `src/components/PricingPage.tsx` — Updated Pricing Page

- Remove Paddle checkout trigger
- Add "Subscribe with Card" button that opens `MpgsCheckoutForm` modal
- Modal shows hosted card form
- On success, show confirmation and close modal
- On error, show error message

---

## 7. Recurring Billing (Future Implementation)

When ready, implement MIT (Merchant-Initiated Transaction) recurring billing:

### `POST /recurring-charge` Edge Function Endpoint

```http
PUT https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/100/merchant/{merchantId}/order/{newOrderId}/transaction/{newTxnId}
Authorization: Basic base64(merchant.{merchantId}:{apiPassword})

{
  "apiOperation": "PAY",
  "sourceOfFunds": {
    "token": "SAVED_TOKEN",
    "provided": {
      "card": {
        "securityCode": "123",
        "storedOnFile": "STORED"
      }
    }
  },
  "order": {
    "amount": 2900,
    "currency": "USD",
    "reference": "recurring_order_456"
  },
  "transaction": {
    "reference": "recurring_txn_456",
    "source": "MERCHANT"
  },
  "agreement": {
    "id": "SAVED_AGREEMENT_ID"
  }
}
```

**Trigger options:**
- Supabase pg_cron scheduled job (monthly)
- External cron service hitting the edge function
- Manual trigger from admin dashboard

---

## 8. Testing

### 8.1 Test Card Numbers (Standard MPGS)

| Card Type | Number | Expiry | CVV |
|-----------|--------|--------|-----|
| Mastercard | `5123450000000008` | Any future date | `100` |
| Visa | `4000000000000002` | Any future date | `100` |

> Use `?debug=true` on the session.js URL for verbose simulator logging during testing.

### 8.2 Test Flow

1. Open pricing page
2. Click "Subscribe to Pro"
3. Enter test card details in hosted fields
4. Click "Pay Now"
5. Verify:
   - Session created successfully
   - Card details accepted (`formSessionUpdate` returns `"ok"`)
   - PAY operation returns `SUCCESS` with `gatewayCode: "APPROVED"`
   - Token created
   - Subscription upserted in DB with `status: active`
   - User sees confirmation

### 8.3 Error Scenarios to Test

| Scenario | Expected Behavior |
|----------|------------------|
| Invalid card number | `fields_in_error` with `cardNumber: "invalid"` → show validation message |
| Expired card | PAY returns `FAILURE` with `gatewayCode: "EXPIRED_CARD"` → show decline message |
| Insufficient funds | PAY returns `FAILURE` with `gatewayCode: "INSUFFICIENT_FUNDS"` |
| Invalid CSC | PAY returns `FAILURE` with `gatewayCode: "INVALID_CSC"` |
| Network error during session creation | Retry button |
| Timeout on `formSessionUpdate` | Retry option shown to user |
| User closes browser mid-flow | No charge; incomplete subscription (no DB change) |

### 8.4 Response Codes

**Transaction gateway codes:**
| Code | Meaning |
|------|---------|
| `APPROVED` | Transaction approved |
| `DECLINED` | Declined by issuer |
| `EXPIRED_CARD` | Card expired |
| `INSUFFICIENT_FUNDS` | Insufficient funds |
| `INVALID_CSC` | Invalid security code |
| `SYSTEM_ERROR` | Internal system error |
| `TIMED_OUT` | Response timed out |
| `BLOCKED` | Blocked by risk/3DS rules |
| `REFERRED` | Refer to card issuer |
| `AUTHENTICATION_FAILED` | 3DS authentication failed |

**AVS gateway codes (Address Verification):**
| Code | Meaning |
|------|---------|
| `ADDRESS_ZIP_MATCH` | Address and ZIP matched |
| `ADDRESS_MATCH` | Street address matched |
| `ZIP_MATCH` | ZIP matched, address not matched |
| `NO_MATCH` | Neither matched |
| `NOT_AVAILABLE` | No data from issuer |

**CSC gateway codes (Card Security Code):**
| Code | Meaning |
|------|---------|
| `MATCHED` | CSC matched |
| `NO_MATCH` | CSC invalid |
| `NOT_PRESENT` | CSC not on card |
| `NOT_PROCESSED` | CSC not processed |

---

## 9. Go-Live Checklist

- [ ] Get production credentials from Seylan Bank (Merchant ID, API Password, Gateway URL)
- [ ] Update `.env` with production values
- [ ] Configure Webhook URL in production Merchant Admin portal (Admin > Webhook Notifications)
- [ ] Update `session.js` URL to production gateway
- [ ] Test full payment flow on production gateway
- [ ] Test 3DS authentication (if enabled on your merchant profile)
- [ ] Set up monitoring for webhook failures
- [ ] Document reconciliation process
- [ ] Remove `isPro() = true` hardcode to activate paid gates

---

## 10. Cleanup Tasks

After MPGS integration is verified:

- [ ] Delete `src/services/paddle.ts`
- [ ] Delete `src/services/paddle.ts` imports in all files
- [ ] Delete `supabase/functions/paddle-webhook/` directory
- [ ] Remove Paddle.js CDN script from `index.html` (line 108)
- [ ] Remove `initializePaddle()` call from `src/index.tsx`
- [ ] Remove Paddle env vars from `.env`
- [ ] Remove Paddle-related types from `src/types.ts`

---

## 11. API Reference (From Official Seylan MPGS Docs)

### Base Endpoints

| Operation | Method | URL | Purpose |
|-----------|--------|-----|---------|
| Create Session | POST | `/api/rest/version/100/merchant/{id}/session` | Create payment session container |
| Update Session | PUT | `/api/rest/version/100/merchant/{id}/session/{sessionId}` | Add order details to session |
| Retrieve Session | GET | `/api/rest/version/100/merchant/{id}/session/{sessionId}` | Get session contents |
| Pay | PUT | `/api/rest/version/100/merchant/{id}/order/{orderId}/transaction/{txnId}` | Authorize + Capture (sale) |
| Authorize | PUT | `/api/rest/version/100/merchant/{id}/order/{orderId}/transaction/{txnId}` | Authorize only |
| Capture | PUT | `/api/rest/version/100/merchant/{id}/order/{orderId}/transaction/{txnId}` | Capture authorized funds |
| Refund | PUT | `/api/rest/version/100/merchant/{id}/order/{orderId}/transaction/{txnId}` | Refund a payment |
| Void | PUT | `/api/rest/version/100/merchant/{id}/order/{orderId}/transaction/{txnId}` | Void a transaction |
| Retrieve Order | GET | `/api/rest/version/100/merchant/{id}/order/{orderId}` | Get order details |
| Create/Update Token | PUT | `/api/rest/version/100/merchant/{id}/token/{tokenId}` | Tokenize card for future use |
| Retrieve Token | GET | `/api/rest/version/100/merchant/{id}/token/{tokenId}` | Get token details |
| Webhook | POST | Configured URL | Async notification of transaction events |

### `formSessionUpdate` Callback Response Formats

**Success:**
```json
{
  "status": "ok",
  "merchant": "TESTMERCHANT",
  "session": {
    "id": "SESSION000218450948092491657986",
    "updateStatus": "SUCCESS",
    "version": "e3f144ce02"
  },
  "sourceOfFunds": {
    "provided": {
      "card": {
        "brand": "MASTERCARD",
        "expiry": { "month": "1", "year": "39" },
        "fundingMethod": "DEBIT",
        "nameOnCard": "John Smith",
        "number": "512345xxxxxx8769",
        "scheme": "MASTERCARD",
        "securityCode": "100"
      }
    },
    "type": "CARD"
  }
}
```

**Field errors:**
```json
{
  "status": "fields_in_error",
  "session": { "id": "SESSION..." },
  "errors": { "cardNumber": "invalid", "securityCode": "invalid" }
}
```

**System error / timeout:**
```json
{ "status": "system_error", "session": { "id": "SESSION..." }, "errors": { "message": "..." } }
{ "status": "request_timeout", "session": { "id": "SESSION..." }, "errors": { "message": "..." } }
```

### Important Security Notes

- All card input fields must be `readonly` and have no `name` attribute
- Anti-clickjacking defense is **required** (`frameEmbeddingMitigation: ["javascript"]`)
- Implement frame-breaker JavaScript on your payment page:
  ```javascript
  if (self === top) { /* remove anti-clickjack style */ }
  else { top.location = self.location; }
  ```
- `frameEmbeddingMitigation` supports: `"javascript"`, `"x-frame-options"`, `"csp"` — specify which ones you implement
- API Password must never be exposed client-side
- Session ID should not be exposed as a password (use `authenticationLimit`)
- Card security code (CSC/CVV) is removed from session after first use (PCI compliance)
- The API version used in session creation **must match** the version in the `session.js` URL
- Session authentication limit (max 25) prevents abuse if session ID is compromised
- Session lasts ~15 minutes by default

---

## 12. Key Differences: Paddle vs MPGS

| Aspect | Paddle | MPGS (Seylan) |
|--------|--------|---------------|
| **Type** | Merchant of Record | Payment Gateway |
| **PCI Compliance** | Fully handled by Paddle | You handle via Hosted Session (SAQ A) |
| **Subscription Management** | Built-in (automated) | Manual (via Agreements + Tokens) |
| **Dunning** | Built-in | Must implement yourself |
| **Tax Handling** | Automated | You handle |
| **Checkout UI** | Paddle-hosted overlay | Your own UI with hosted iframes |
| **Webhooks** | Paddle webhooks | MPGS notifications (configurable) |
| **Test Cards** | Paddle test cards | Standard MPGS test cards |
| **Pricing** | % + $0.50 transaction fee | Negotiated with Seylan Bank |

---

## 13. Additional SDKs Available (Not Needed for This Integration)

The MPGS test gateway also hosts SDKs for:
- **Checkout.js** — For Hosted Checkout integration (simpler, less customizable)
- **PayPal SDK** (`gateway-paypal.js`) — For accepting PayPal payments through MPGS
- **Click to Pay SDK** — Mastercard's Click to Pay solution
- **Risk SDK** — NuDetect fraud risk assessment
- **Rupay SDK** — RuPay authentication for Indian payments
- **ThreeDS SDK** — 3D Secure authentication flows
- **Session.js** — Our integration method (Hosted Session)

These are alternative integration methods/payment methods available via the gateway, not required for our card payment integration.

---

*Documentation sourced from: https://test-seylan.mtf.gateway.mastercard.com/api/documentation/integrationGuidelines/index.html*
*API Version: 100 | Last Updated: 2026-06-01*
