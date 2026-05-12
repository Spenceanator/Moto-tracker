# Drydock Bill of Sale Generator - Design Document

Version: 1.0
Date: May 11, 2026
Status: Implemented (v6.4.0)


## Problem

Private vehicle and firearm sales need a bill of sale for legal protection and record-keeping. Utah requires specific information for vehicle sales (form TC-843) and federal law requires odometer disclosure (TC-891). Currently, sellers either use generic online templates, handwrite everything, or skip it entirely. None of these integrate with existing inventory data.

For a motorcycle flipper running Drydock, the bike info is already in the app — year, make, model, VIN, buyer from customers[]. Having to re-enter all of that into a separate form is wasted effort.


## Solution

A bill of sale generator built into Drydock as `src/billsale.js`. Three modes cover different sale types, with auto-fill from existing data and PDF output via jsPDF.


## Modes

### Vehicle Mode (Default)
Modeled after Utah form TC-843 with embedded TC-891 odometer disclosure. Covers cars, motorcycles, trucks, vans, trailers, boats, off-highway vehicles, and snowmobiles.

**Fields:**
- Seller: name, address, city, state, zip, phone
- Buyer: name, address, city, state, zip, phone
- Buyer ID: driver's license photo capture (optional)
- Vehicle type selector (motorcycle, car, truck, van, trailer, boat, off-highway, snowmobile)
- Vehicle description: year, make, model, VIN, color, license plate, plate included toggle
- Sale terms: price, trade-in allowance, net price (calculated), date
- Odometer disclosure (vehicles only, not boats/trailers/snowmobiles): reading, status (actual / not actual / exceeds mechanical limit)
- Title status: clean, salvage, rebuilt + lien holder field
- As-is clause: auto-generated legal text declaring sale free and clear
- Signatures: seller + buyer (draw or type-to-sign)

### Firearm Mode
For private firearm sales. Includes firearm-specific fields and buyer eligibility acknowledgment.

**Fields:**
- Seller: same as vehicle
- Buyer: same as vehicle
- Buyer ID: driver's license photo capture (prominent/recommended)
- Firearm description: make, model, serial number, caliber/gauge, type (pistol/rifle/shotgun), barrel length
- Sale terms: price, date
- Buyer eligibility acknowledgment: checkbox confirming legal eligibility under federal and state law
- As-is clause
- Signatures: seller + buyer

### General Mode
For non-vehicle, non-firearm sales — parts, tools, equipment, anything.

**Fields:**
- Seller: same as vehicle
- Buyer: same as vehicle
- Buyer ID: driver's license photo capture (optional)
- Item description: free-text textarea
- Sale terms: price, date
- As-is clause
- Signatures: seller + buyer


## Auto-Fill

In vehicle mode, a dropdown at the top lists all bikes from `data.bikes[]` and `data.sold[]`. Selecting one populates year, make, model, VIN, color, and price from the existing record.

Future: auto-fill buyer info from `data.customers[]` when the sold record has a linked customer.


## Signature Capture

Two signature modes available for both buyer and seller:

**Draw mode:** Canvas element with touch/mouse event handlers. User draws their signature with finger (phone) or mouse (desktop). Saves as PNG data URL. Includes a signature baseline for alignment.

**Type mode:** Text input with cursive font rendering. Typed name is rendered onto a canvas with a script font, producing a signature-style image. Auto-generates the PNG as the user types.

Both modes produce a PNG data URL that gets embedded directly into the PDF.


## Driver's License Photo

Camera/file input using `<input type="file" accept="image/*" capture="environment">`. On mobile, this opens the camera directly. On desktop, opens a file picker. Image is compressed to 800px max width via the existing `compressImg()` helper.

The DL photo appears on the last page of the PDF under "Buyer Identification (for seller's records)."

For firearm sales, the DL section is labeled "(Recommended)" to encourage use. For vehicle and general sales, it's optional.


## PDF Output

Generated client-side via **jsPDF** (loaded from CDN: `cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js`). Letter-size portrait orientation.

### PDF Layout

```
┌──────────────────────────────────┐
│        BILL OF SALE — MOTOR VEHICLE       │
│   Utah Code Title 41 · Form TC-843       │
├──────────────────────────────────┤
│ SELLER                                    │
│ Name _____________ Phone _____________    │
│ Address ________________________________  │
│ City __________ State ____ Zip ________   │
├──────────────────────────────────┤
│ BUYER                                     │
│ (same layout as seller)                   │
├──────────────────────────────────┤
│ VEHICLE DESCRIPTION                       │
│ Type: Motorcycle                          │
│ Year ___ Make _______ Model _____ Color _ │
│ VIN ______________________ Plate ________ │
│ [x] Plate included  [ ] Plate NOT included│
├──────────────────────────────────┤
│ SALE TERMS                                │
│ Price $_____ Trade-in $_____ Net $______  │
│ Date __________                           │
│ (As-is clause text)                       │
├──────────────────────────────────┤
│ ODOMETER DISCLOSURE                       │
│ Reading: _______ miles                    │
│ [x] Actual  [ ] Not actual  [ ] Exceeds  │
├──────────────────────────────────┤
│ TITLE STATUS                              │
│ [x] Clean  [ ] Salvage  [ ] Rebuilt       │
├──────────────────────────────────┤
│ SIGNATURES                                │
│ Seller: [signature image]     Date: _____ │
│ Print: ___________________                │
│ Buyer:  [signature image]     Date: _____ │
│ Print: ___________________                │
├──────────────────────────────────┤
│ BUYER IDENTIFICATION                      │
│ [DL photo]                                │
└──────────────────────────────────┘
```

Filename format: `bill-of-sale-YYYY-MM-DD.pdf`


## Legal Compliance Notes

### Utah Vehicle Sales
- Bill of sale determines tax basis: if buyer has a signed bill of sale with required info, sales/use tax is based on the net purchase price shown. Without one, DMV calculates tax on Fair Market Value.
- Title transfer must happen within 60 days of sale.
- Form TC-843 is the official template; our generator includes all TC-843 fields plus extras.

### Odometer Disclosure
- Required by federal law (49 CFR 580) and Utah Code 41-1a-902.
- Applies to vehicles under 20 years old.
- Seller must disclose actual mileage or indicate discrepancy.
- Both parties must retain copies for at least 4 years.
- False statements can result in fines and/or imprisonment.

### Firearm Sales
- Utah does not require a bill of sale for private firearm sales, but having one provides legal protection for both parties.
- No Utah state requirement for background checks on private sales (as of May 2026).
- Buyer eligibility acknowledgment is a best practice, not a legal requirement.
- DL photo capture is strongly recommended for seller's records.


## Files

### Created
- `src/billsale.js` (~350 lines) — Form UI, signature canvas, DL capture, PDF generation

### Modified
- `src/shell_head.html` — Added jsPDF CDN script tag
- `src/build.sh` — Added billsale.js to FILES array (before app.js)
- `src/config.js` — Added "Bill of Sale" nav button
- `src/app.js` — Added billsale view routing

### Dependencies
- jsPDF 2.5.2 from CDN (same pattern as JSZip for transfers)
