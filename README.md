<a href="https://ronakmaheshwari.10xdevs.me">
  <img alt="Capital - Secure Event Ticketing Platform" src="https://xntcmbrnuyvzjeupfbyt.supabase.co/storage/v1/object/public/uploads/capital.png">
</a>

<h3 align="center">Capital</h3>

**Capital** is a **secure, scalable, and modern event ticketing platform**, developed as part of a final-year BE project. It addresses critical challenges in traditional ticketing systems, including:  

- **Ticket Fraud**  
- **Duplicate Entries**  
- **Unauthorized Reselling**  

Capital achieves this through a **hybrid architecture** that combines **centralized orchestration** with **decentralized cryptographic primitives**, eliminating inefficiencies in legacy QR-only systems and blockchain-heavy platforms.  

## 🚀 How Capital Solves the Problems  

### 1. Unauthorized Resale 
- In legacy platforms like *EventOrchestr8*, tickets were just QR payloads → easily forwarded/resold.  
- Capital issues **cryptographically signed tickets bound to a user’s account** (via Ed25519).  
- Even if the QR is forwarded, validation fails unless presented by the legitimate account owner.  
- **Result:** Unauthorized resale eliminated.  

### 2. Redundant Blockchain Usage & Gas Fees  
- EventOrchestr8 stored tickets on Ethereum → high gas fees & slow validation.  
- Capital uses a **centralized backend as the authoritative record**, while still leveraging **cryptographic signing** for trust.  
- Blockchain is optional (for audit logs), not mandatory.  
- **Result:** No gas fees, faster validation.  

### 3. Refunds & Event Cancellations 
- Blockchain-based ticketing makes refunds/cancellations difficult.  
- In Capital, the **backend updates ticket states instantly** (refunded, canceled, redeemed).  
- Organizers handle real-world contingencies in real-time.  
- **Result:** Flexible and practical refund management.  

### 4. Third-Party Dependence (Firebase, Wallets) 
- EventOrchestr8 relied heavily on Firebase → external dependency risks.  
- Capital uses a **custom backend in TypeScript** with internal wallets and webhooks.  
- **Result:** Improved control, better data integrity, minimal third-party reliance.  

### 5. Scalability 
- Capital leverages **Ed25519 cryptographic verification** (microsecond-level).  
- Validation is near-instant, scalable for **stadium-scale events**.  
- Tickets are **atomically locked** post-redemption → one-time use guaranteed.  
- **Result:** High-throughput, real-time validation.  

---

## 🛠️ Technology Stack  

| **Backend** | **Frontend** | **DevOps / Tooling** |  
|-------------|--------------|----------------------|  
| Node.js | Next.js | TypeScript |  
| Express.js | React.js | GitHub Actions (CI/CD) |  
| Prisma | React Router DOM | Biome (lint/format) |  
| PostgreSQL | React Query | Vitest (testing) |  
| Redis / Redis Queue | Zustand | Resend (emails) |  
| WebSocket | Tailwind CSS | Prometheus |  
| Libsodium (encryption) | Shadcn/UI | Grafana & Loki |  
| Decimal.js | Storybook | GitOps (infra) |  
| Supabase (storage) | | Scaling + Stress Testing |  
| Docker, Nginx, Kubernetes | | |  

---

## 🏗️ System Architecture  

The platform integrates centralized orchestration with decentralized cryptographic primitives.  

<img alt="System architecture" src="https://xntcmbrnuyvzjeupfbyt.supabase.co/storage/v1/object/public/uploads/1.png">

- **Centralized Backend** – Authoritative source of truth (PostgreSQL + Redis).  
- **Decentralized Cryptography** – Ed25519 ensures ticket authenticity.  
- **Three-Queue Mechanism** – Pending, In-progress, Failed (Dead-letter).  
- **Redis** – Caching, concurrency control, pub/sub for validators.  
- **Validators** – Mobile/kiosk apps verifying tickets in real-time.  

---

## 🎫 Ticket Lifecycle  

1. **Discovery** → Users browse events (cached with Redis).  
2. **Purchase** → System issues **signed ticket payload** embedded in a QR code.  
3. **Storage** → Tickets securely stored in user’s account wallet.  
4. **Redemption** → Validator scans QR → backend verifies signature & ownership.  
5. **Refunds/Cancellations** → Organizer updates backend state instantly.  

---

## 🔒 Security Highlights  

- **Bcrypt** – Secure password hashing (salt + cost factor).  
- **Ed25519** – Digital signatures for ticket authenticity.  
- **Four-Layer Encryption** – Canonical serialization + timestamping for replay prevention.  
- **JWT + Redis-backed Refresh Tokens** – Device-specific, short-lived, tamper-resistant sessions.  
- **TLS Everywhere** – Encrypted communication between clients, validators, and backend.  
- **Immutable Audit Logs** – Forensics & fraud prevention.  
- **Rate-Limiting & Anomaly Detection** – Protection against DoS/fraud attacks.  
- **Hardware-backed Vaults** – Secure key management.  

---

## 📊 Scalability & Performance  

- **Node.js clustering** → Utilizes multi-core CPU for parallel validation.  
- **Kubernetes auto-scaling** → Handles fluctuating workloads.  
- **Redis replication** → Ensures distributed state consistency.  
- **Microsecond Ed25519 signature checks** → Thousands of ticket validations/sec.  
- **Cloud-native deployment** → Elastic, fault-tolerant, globally scalable.  

---

## 🔑 Key Aspects  

- **Liquidity Pooling** – Event earnings are pooled securely, enabling transparent settlements for organizers post-event.  
- **Organizer’s Role & Earnings** – Each organizer has a dedicated wallet. Earnings are credited after event completion (post-refunds).  
- **Refund Mechanism** – Flexible, organizer-approved refunds update wallet balances and ticket states in real time.  
- **Scaling** – Supports both vertical (Node.js clustering) and horizontal (Kubernetes) scaling to handle high-demand events.  
- **Custom Transaction System** – Inspired by Razorpay, Capital implements an in-house wallet and payment processing layer with deposits, withdrawals, payouts, and webhook-driven reconciliation.  

---

## 🤝 Contributing

We welcome contributions! Please fork the repository and submit a pull request with your improvements.
Ensure reading <a href="https://github.com/ronakmaheshwari/capital/blob/main/Contribute.md">Contributor.md</a>

---
## 🛠️ Getting Started  

### 1. Clone the Repository  
```bash
git clone https://github.com/your-username/capital.git
cd capital
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/capital
REDIS_URL=redis://localhost:6379
SUPABASE_URL=...
SUPABASE_KEY=...
RESEND_API_KEY=...
```

### 4. Run with Docker Compose

```bash
docker-compose up --build
```

### 5. Run Locally (Dev Mode)

```bash
npm run dev
```

---

## 📜 License

This project is licensed under the **MIT License**.

---
