# 🍯 Honey Chain

Honey Chain is a professional Smart India Hackathon prototype for honey traceability under the KVIC Honey Mission. It leverages blockchain and IoT to ensure that honey from rural beekeepers reaches consumers with an immutable proof of authenticity.

Built and Created by **HEMANTH RAO**.

The platform provides three specialized interfaces:
- **Beekeeper Dashboard**: Register honey batches and monitor simulated IoT hive health.
- **Consumer Verification**: Verify a batch ID, view provenance, and test cryptographic tamper detection.
- **Admin/KVIC Dashboard**: Manage beekeeper clusters, review national analytics, and monitor blockchain integrity.

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Launch Development Server**:
   ```bash
   npm run dev
   ```

3. **Access the Platform**:
   Open the local URL printed by Vite (usually `http://127.0.0.1:5173/`).

## 🛠️ Core Technical Stack

- **Frontend**: React 19, Tailwind CSS 4.0
- **Build Tool**: Vite
- **Blockchain**: Custom SHA-256 Hash-Linked Ledger (Prototype)
- **IoT Simulation**: Simulated DHT22 (Temp/Humidity) & HX711 (Weight) streams
- **SEO**: JSON-LD Structured Data, Dynamic Meta Tags, Canonical URLs

## 📖 Demo Workflow for Judges

To present a seamless story of traceability, follow this sequence:

1. **KVIC Onboarding (Admin)**: Add a beekeeper profile (e.g., *Ravi Kumar Apiary*).
2. **Batch Registration (Beekeeper)**: Register a honey batch from a specific hive, including floral source and lab status.
3. **IoT Insight (Beekeeper)**: Show the real-time hive telemetry and AI yield forecast.
4. **Authenticity Check (Consumer)**: Use the Batch ID to verify the honey's origin and view the blockchain proof.
5. **Security Demo (Admin $\rightarrow$ Consumer)**: 
   - Run a "Quantity Manipulation" attack in the Admin panel.
   - Attempt to verify the same batch in the Consumer portal to show the **Tamper Warning**.
   - Restore integrity and verify again.

## 📂 Project Structure

```text
honey-chain/
  ├── index.html          # Entry HTML with SEO base
  ├── vite.config.js      # Production build configuration
  ├── src/
  │   ├── App.jsx         # Main Application Router & Layout
  │   ├── main.jsx        # React Entry Point
  │   ├── components/     # UI Components (Admin, Beekeeper, Consumer, SEO)
  │   └── utils/          # Core Logic (Blockchain, Validation, Mock Data)
  └── README.md           # Project Documentation
```

## 📜 License & Attribution
This project is a prototype created for the Smart India Hackathon 2026.
**Created by: Hemanth Rao**
