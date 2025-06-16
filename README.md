# TrustVault

TrustVault is a blockchain-based document verification and property registry system that leverages Ethereum smart contracts for secure, transparent, and tamper-proof record-keeping.

![TrustVault Platform](https://github.com/zs0c131y/TrustVault/blob/main/public/assets/trustland.png)

## 📋 Overview

TrustVault provides a comprehensive solution for:

- **Property Registration & Verification**: Digitally register property details with blockchain-backed verification
- **Property Ownership Transfer**: Securely transfer property ownership with blockchain records
- **Document Verification**: Authenticate and store important documents with cryptographic proof
- **Government Integration**: Dedicated portal for government officials to verify and process requests

The system combines traditional database storage with blockchain verification to create a hybrid architecture that benefits from the security of blockchain while maintaining the performance and flexibility of traditional systems.

## 🚀 Features

### Property Registry
- Register new properties with detailed information
- Blockchain-backed verification process
- Secure ownership records
- Transparent transaction history
- Digital document storage and verification

### Document Verification
- Verify important personal documents (ID cards, certificates, etc.)
- Blockchain timestamping and authentication
- IPFS storage integration for document content
- Revocation mechanisms for invalid documents
- Expiration and renewal management

### User Management
- Secure authentication system
- Role-based access control
- Profile management
- Multi-device session management
- Appointment scheduling with registrar offices

### Government Portal
- Dedicated dashboard for government officials
- Request verification and approval workflow
- Analytics and metrics dashboard
- Document verification tools
- Audit logging and compliance tracking

## 🔧 Technical Architecture

### Smart Contracts
TrustVault utilizes two main Ethereum smart contracts:

1. **PropertyRegistry.sol**: Handles property registration, verification, and ownership transfers
2. **DocumentVerification.sol**: Manages document verification, revocation, and updates

### Backend
- **Node.js/Express**: RESTful API server
- **MongoDB**: Primary database for storing user data and transaction records
- **Hardhat**: Ethereum development environment
- **IPFS**: Decentralized file storage system

### Frontend
- **HTML/CSS/JavaScript**: Client-side implementation
- **Web3.js**: Ethereum blockchain interaction
- **Firebase Authentication**: User authentication system

### Security Features
- JWT-based authentication
- Rate limiting protection
- XSS and CSRF protection
- Helmet security headers
- Input sanitization
- Secure file handling

## 🛠️ Installation & Setup

### Prerequisites
- Node.js v18+ and npm
- MongoDB
- Hardhat
- IPFS daemon (optional for local development)
- Ethereum wallet (MetaMask recommended)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/zs0c131y/TrustVault.git
   cd TrustVault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   Copy the example environment file and modify it with your values:
   ```bash
   cp config.example.js config.js
   cp .env.example .env
   ```

4. **Configure MongoDB**
   Update MongoDB connection URI in your `.env` file.

5. **Compile and deploy smart contracts**
   ```bash
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network localhost
   ```

6. **Start the application**
   ```bash
   # Start all services concurrently
   npm run dev
   
   # Or start services individually
   npm run backend  # Start Express server
   npm run hardhat  # Start local Ethereum node
   npm run ipfs     # Start IPFS daemon
   ```

## 🏗️ Project Structure

```
TrustVault/
├── artifacts/            # Compiled contract artifacts
├── cache/                # Hardhat cache
├── contracts/            # Ethereum smart contracts
│   ├── DocumentVerification.sol
│   └── PropertyRegistry.sol
├── deployments/          # Contract deployment data
├── logs/                 # Application logs
├── middleware/           # Express middleware
├── models/               # MongoDB models
├── public/               # Frontend assets and HTML pages
│   ├── assets/           # Static assets (images, fonts)
│   ├── contracts/        # Contract ABIs for frontend
│   └── *.html, *.js, *.css  # Frontend pages and scripts
├── scripts/              # Deployment and utility scripts
├── services/             # Backend services
├── uploads/              # Document upload storage
├── utils/                # Utility functions
├── hardhat.config.js     # Hardhat configuration
├── package.json          # Project dependencies
├── server.js             # Express server entry point
└── README.md             # Project documentation
```

## 💻 Usage

### User Workflows

1. **Property Registration**
   - Navigate to the property registration page
   - Fill in property details and upload required documents
   - Submit the registration request
   - Track the verification status
   - Receive blockchain verification once approved

2. **Document Verification**
   - Go to the document verification section
   - Upload the document and provide required information
   - Submit for verification
   - Track the verification process
   - Access verified documents with blockchain proof

3. **Property Transfer**
   - Select a registered property
   - Enter new owner details
   - Complete the transfer process
   - Verification by government officials
   - Blockchain record update

### Government Official Workflow

1. **Request Verification**
   - Login to government dashboard
   - View pending requests
   - Verify document authenticity
   - Approve or reject requests
   - Monitor verification metrics

## 🔒 Security Considerations

- All sensitive data is encrypted before storage
- Document hashes rather than actual content are stored on the blockchain
- JWTs have limited lifetime and secure storage
- Rate limiting prevents brute force attacks
- Input sanitization prevents injection attacks
- Document access is restricted by ownership
- Multi-level verification workflow

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/newuser`)
3. Commit your changes (`git commit -m 'Chnages'`)
4. Push to the branch (`git push origin feature/newuser`)
5. Open a Pull Request

## 📄 License

This project is licensed under a Custom License with the following key restrictions:

- **Non-Commercial Use Only**: Commercial use prohibited without prior written permission
- **No Financial Gain**: Reproduction for financial or personal gain is prohibited
- **Required Attribution**: All uses must include proper attribution to the authors
- **End-User Access**: Permission granted only for trying the software as an end user

See the LICENSE file for complete terms.

## 👥 Authors

- **Abhisha** - abhabhisha.cs22@rvce.edu.in
- **Bhumika** - bhumikak.cs22@rvce.edu.in

## 🙏 Acknowledgments

- OpenZeppelin for secure contract libraries
- The Ethereum community for blockchain infrastructure
- IPFS project for decentralized storage solutions
