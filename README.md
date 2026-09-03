# Honey Chain

Honey Chain is a Smart India Hackathon prototype for honey traceability under the KVIC Honey Mission. It shows how beekeepers can register honey batches, consumers can verify authenticity, and KVIC/admin users can monitor production and blockchain integrity.

The app has three dashboards:

- Beekeeper Dashboard: register honey batches and view simulated IoT hive health.
- Consumer Verification: verify a batch ID, view provenance, scan QR output, and test tamper detection.
- Admin/KVIC Dashboard: manage beekeeper profiles, review analytics, and run the security demo.

## Run The Website

1. Open a terminal in the project folder.
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

If that port is busy, Vite will print another port such as `5174`.

## Recommended SIH Demo Setup

Before presenting to Smart India Hackathon judges, prepare the app with at least one beekeeper and one honey batch.

1. Start the website with `npm run dev`.
2. Open the Admin/KVIC dashboard.
3. Add a beekeeper profile.
4. Go to the Beekeeper dashboard.
5. Register a honey batch.
6. Go to the Consumer dashboard.
7. Verify the batch ID.
8. Return to Admin/KVIC and run the security attack simulation.

This creates a complete story: registration, verification, analytics, and tamper detection.

## Dashboard 1: Beekeeper

Use this dashboard as the producer or beekeeper portal.

### Step-By-Step UI Flow

1. Open the website.
2. Select the `Beekeeper` tab from the top navigation.
3. If no beekeeper profile exists, click `Open KVIC Admin`.
4. Add a beekeeper profile from the Admin/KVIC dashboard, then return to the Beekeeper dashboard.
5. Check the `Active Beekeeper Profile` dropdown.
6. Confirm the profile, location, rating, and active hive count.
7. Review the dashboard cards:
   - Registered Batches
   - Active IoT Hives
   - Quality Rating
8. Click `+ Register New Honey Batch`.
9. Select the harvest hive ID.
10. Enter harvest quantity in kilograms.
11. Select the floral source.
12. Tick `KVIC Lab Quality Tested` if the batch is lab certified.
13. Add optional harvest notes, such as moisture level or apiary observation.
14. Click `Sign & Mine to Honey Chain`.
15. Confirm the new batch appears in `Your Registered Honey Batches`.
16. Click `Verify` beside the batch to move directly to the Consumer Verification dashboard with that batch selected.

### What To Explain To Judges

- Each honey batch becomes a block in a SHA-256 hash-linked ledger.
- Beekeeper inputs are sanitized and validated before the block is added.
- Hive telemetry is simulated to represent ESP32, DHT22, and HX711 sensor readings.
- The charts show temperature, humidity, and hive weight trends.
- The AI yield forecast is a rule-based prototype showing how real sensor data could guide harvest planning.

## Dashboard 2: Consumer

Use this dashboard as the buyer-facing authenticity verification flow.

### Step-By-Step UI Flow

1. Select the `Consumer` tab from the top navigation.
2. Enter a valid honey batch ID.
3. If you came from the Beekeeper dashboard, the selected batch ID may already be filled in.
4. Click `Verify`.
5. Review the verification result.
6. If the chain is valid, show the authentic batch details:
   - Batch ID
   - Beekeeper name
   - Apiary location
   - Harvest date
   - Quantity
   - Floral source
   - Hive ID
   - Lab test status
7. Show the blockchain proof section:
   - Current block number
   - Current block hash
   - Previous hash
   - Timestamp
8. Show the QR code generated for the verified batch.
9. Use the built-in tampering demo only after explaining the clean verification result.
10. Modify a field such as quantity or location in the tampering panel.
11. Apply the tampering change.
12. Verify again and show that the app detects the broken hash chain.
13. Restore chain integrity after the demo so the app is ready for the next judge group.

### What To Explain To Judges

- Consumers do not need to trust a label blindly.
- They can verify the batch ID against the ledger.
- Any post-registration change breaks the cryptographic hash.
- The red tamper warning proves that fraud is detectable.
- In production, the QR code would be printed on honey jar labels.

## Dashboard 3: Admin/KVIC

Use this dashboard as the government, institutional, or mission-control view.

### Step-By-Step UI Flow

1. Select the `Admin / KVIC` tab from the top navigation.
2. Check the blockchain health banner at the top.
3. Review the KPI cards:
   - Total Harvest Batches
   - Total Honey Volume
   - Active Beekeepers
   - Lab Tested Compliance
4. Review the regional production chart.
5. Review the floral source varietal chart.
6. In `KVIC Beekeeper Apiary Clusters`, click `Add Beekeeper`.
7. Enter the beekeeper name.
8. Enter the apiary location, for example `Sundarbans, West Bengal`.
9. Enter IoT hive IDs separated by commas, for example `HIVE001, HIVE002`.
10. Enter a rating, for example `4.7`.
11. Click `Add Beekeeper`.
12. Use the edit icon to update beekeeper details if needed.
13. Use the delete icon only if you want to remove that beekeeper and their batches.
14. Review `Live Blockchain Transaction Stream` after adding beekeeper cluster records with dates.
15. Open the security demo panel.
16. Run an attack scenario:
   - Quantity manipulation
   - Location fraud
   - Certification fraud
17. Show the attack result and target batch ID.
18. Open that batch in the Consumer dashboard to prove tamper detection.
19. Reset the blockchain to a valid state after the demo.

### What To Explain To Judges

- KVIC can monitor producer onboarding, honey volume, lab compliance, and regional production.
- The dashboard converts batch-level records into policy and operations data.
- Attack simulation demonstrates why blockchain is useful for honey traceability.
- The production roadmap points toward a permissioned network such as Hyperledger Fabric.

## Full SIH Presentation Script

Use this order for a clean 5 to 7 minute showcase.

### 1. Opening

Say:

```text
Honey adulteration and fake origin claims reduce consumer trust and hurt genuine rural beekeepers. Honey Chain solves this by combining blockchain traceability, QR verification, and IoT-based hive monitoring for the KVIC Honey Mission.
```

Then show the top navigation with the three dashboards.

### 2. Admin/KVIC Onboarding

1. Open `Admin / KVIC`.
2. Show that KVIC can add certified beekeeper profiles.
3. Add a sample beekeeper:
   - Name: `Ravi Kumar Apiary`
   - Location: `Coorg, Karnataka`
   - Hives: `HIVE001, HIVE002`
   - Date: choose the current demo date
   - Rating: `4.8`
4. Explain that this represents official onboarding of a producer cluster.

### 3. Beekeeper Batch Registration

1. Open `Beekeeper`.
2. Select the newly added beekeeper.
3. Click `+ Register New Honey Batch`.
4. Enter a sample batch:
   - Hive: `HIVE001`
   - Quantity: `18.5`
   - Floral Source: `Wild Forest` or `Multiflora (Mixed)`
   - Lab Tested: checked
   - Notes: `Moisture within acceptable KVIC range`
5. Click `Sign & Mine to Honey Chain`.
6. Show the generated batch in the table.
7. Explain that the batch is now immutable in the prototype ledger.

### 4. IoT And AI Story

1. Stay on the Beekeeper dashboard.
2. Show temperature, humidity, and hive weight charts.
3. Show the AI yield forecast.
4. Explain that real deployment can connect low-cost ESP32 sensor kits through LoRaWAN or mobile networks.

### 5. Consumer Verification

1. Click `Verify` beside the registered batch.
2. Show the Consumer Verification dashboard.
3. Click `Verify` if needed.
4. Point out the authentic status.
5. Show batch origin, beekeeper, quantity, floral source, lab status, and QR code.
6. Explain that consumers can scan the QR code from a jar label before buying.

### 6. Blockchain Security Demo

1. Open `Admin / KVIC`.
2. Open the security simulation panel.
3. Run `Quantity Manipulation` first because it is easiest to understand.
4. Show the attack result and target batch ID.
5. Navigate to Consumer Verification for that target batch.
6. Verify the batch.
7. Show the tampering warning.
8. Explain that changing one value changes the block hash and breaks the chain.
9. Reset blockchain integrity before continuing.

### 7. Scale And Impact

Show the Admin/KVIC roadmap section and say:

```text
This browser prototype demonstrates the workflow. For production, the ledger can move to Hyperledger Fabric, lab certificates can be stored through secure document storage, and IoT data can be signed by certified hive devices. The same flow can scale from a local beekeeper cluster to state and national KVIC monitoring.
```

### 8. Closing

Say:

```text
Honey Chain gives beekeepers proof of quality, gives consumers confidence, and gives KVIC real-time visibility into honey production and fraud attempts.
```

## Suggested Demo Data

Use these values if you need a quick repeatable demo.

### Beekeeper Profile

```text
Name: Ravi Kumar Apiary
Location: Coorg, Karnataka
Hives: HIVE001, HIVE002
Rating: 4.8
```

### Honey Batch

```text
Hive: HIVE001
Quantity: 18.5
Floral Source: Wild Forest
Lab Tested: Yes
Notes: Moisture within acceptable KVIC range
```

## Production Story For Judges

The prototype currently runs fully in the browser for fast demonstration. A real deployment would include:

- Hyperledger Fabric for a permissioned KVIC blockchain network.
- Certified beekeeper identities with role-based access.
- Signed IoT telemetry from hive devices.
- Digital lab certificates linked to each batch.
- QR labels printed at batch registration.
- Regional KVIC dashboards for monitoring and policy decisions.
- Server-side validation, authentication, audit logging, and secure storage.

## Troubleshooting During Demo

If the website opens on an empty Beekeeper dashboard:

1. Click `Open KVIC Admin`.
2. Add a beekeeper profile.
3. Return to `Beekeeper`.

If a batch ID does not verify:

1. Confirm the batch was registered successfully.
2. Copy the exact batch ID from the Beekeeper table.
3. Paste it into Consumer Verification.
4. Click `Verify`.

If tamper detection stays active after a demo:

1. Open `Admin / KVIC`.
2. Open the security simulation panel.
3. Click the reset option to restore blockchain integrity.

If the dev server does not start:

1. Run `npm install`.
2. Run `npm run dev` again.
3. Use the exact local URL printed by Vite.

## Useful Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Project Structure

```text
honey-chain/
  index.html
  package.json
  package-lock.json
  vite.config.js
  README.md
  src/
    App.jsx
    main.jsx
    index.css
    components/
      admin/AdminDashboard.jsx
      beekeeper/BeekeeperDashboard.jsx
      consumer/ConsumerVerification.jsx
    utils/
      beekeepers.js
      blockchain.js
      mockData.js
      validation.js
      attackDemo.js
```
