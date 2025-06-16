// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DocumentVerification is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Document {
        string documentHash;      // Hash of the document
        string documentType;      // Type of document (Aadhaar, PAN, etc.)
        address issuedTo;        // Address of document owner
        address verifiedBy;      // Address of the verifier
        uint256 issuanceDate;    // When the document was issued
        uint256 expiryDate;      // When the document expires
        bool isValid;            // Current validity status
        string metadataURI;      // Additional metadata
    }

    // Mapping from document hash to Document struct
    mapping(bytes32 => Document) public documents;
    
    // Mapping from address to their document hashes
    mapping(address => bytes32[]) public userDocuments;
    
    // Events
    event DocumentVerified(bytes32 indexed documentId, address indexed issuedTo, string documentType);
    event DocumentRevoked(bytes32 indexed documentId, address indexed revokedBy);
    event DocumentUpdated(bytes32 indexed documentId, address indexed updatedBy);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function verifyDocument(
        string memory documentHash,
        string memory documentType,
        address issuedTo,
        uint256 expiryDate,
        string memory metadataURI
    ) public whenNotPaused nonReentrant {
        require(hasRole(VERIFIER_ROLE, msg.sender), "Caller is not a verifier");
        
        bytes32 documentId = keccak256(abi.encodePacked(documentHash, issuedTo));
        
        require(documents[documentId].issuanceDate == 0, "Document already exists");

        documents[documentId] = Document({
            documentHash: documentHash,
            documentType: documentType,
            issuedTo: issuedTo,
            verifiedBy: msg.sender,
            issuanceDate: block.timestamp,
            expiryDate: expiryDate,
            isValid: true,
            metadataURI: metadataURI
        });

        userDocuments[issuedTo].push(documentId);
        
        emit DocumentVerified(documentId, issuedTo, documentType);
    }

    function revokeDocument(bytes32 documentId) public whenNotPaused {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || 
            hasRole(VERIFIER_ROLE, msg.sender),
            "Caller cannot revoke documents"
        );
        
        require(documents[documentId].issuanceDate != 0, "Document does not exist");
        require(documents[documentId].isValid, "Document already revoked");

        documents[documentId].isValid = false;
        
        emit DocumentRevoked(documentId, msg.sender);
    }

    function updateDocument(
        bytes32 documentId,
        string memory newMetadataURI,
        uint256 newExpiryDate
    ) public whenNotPaused {
        require(hasRole(VERIFIER_ROLE, msg.sender), "Caller is not a verifier");
        require(documents[documentId].issuanceDate != 0, "Document does not exist");
        require(documents[documentId].isValid, "Document is revoked");

        documents[documentId].metadataURI = newMetadataURI;
        documents[documentId].expiryDate = newExpiryDate;
        
        emit DocumentUpdated(documentId, msg.sender);
    }

    function getUserDocuments(address user) 
        public 
        view 
        returns (bytes32[] memory) 
    {
        return userDocuments[user];
    }

    function getDocument(bytes32 documentId) 
        public 
        view 
        returns (Document memory) 
    {
        return documents[documentId];
    }

    // Admin functions
    function addVerifier(address verifier) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        grantRole(VERIFIER_ROLE, verifier);
    }

    function removeVerifier(address verifier) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        revokeRole(VERIFIER_ROLE, verifier);
    }

    function pause() public {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _pause();
    }

    function unpause() public {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _unpause();
    }
}