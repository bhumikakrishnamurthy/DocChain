// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PropertyRegistry {
    struct Property {
        string propertyId;
        string propertyName;
        string location;
        string propertyType;
        address owner;
        uint256 registrationDate;
        bool isVerified;
        uint256 lastTransferDate;
    }

    mapping(address => Property) public properties;
    mapping(string => address) public propertyIdToAddress;

    event PropertyRegistered(
        address indexed blockchainId,
        string propertyId,
        string propertyName,
        address indexed owner
    );

    event PropertyVerified(address indexed blockchainId);

    event OwnershipTransferred(
        address indexed blockchainId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 transferDate
    );

    function registerProperty(
        string memory _propertyId,
        string memory _propertyName,
        string memory _location,
        string memory _propertyType
    ) public returns (address) {
        // Generate deterministic address using keccak256
        bytes32 hash = keccak256(
            abi.encodePacked(_propertyId, _propertyName, _location)
        );
        address blockchainId = address(uint160(uint256(hash)));
        
        require(bytes(properties[blockchainId].propertyId).length == 0, "Property already exists");
        
        properties[blockchainId] = Property({
            propertyId: _propertyId,
            propertyName: _propertyName,
            location: _location,
            propertyType: _propertyType,
            owner: msg.sender,
            registrationDate: block.timestamp,
            isVerified: false,
            lastTransferDate: block.timestamp
        });

        propertyIdToAddress[_propertyId] = blockchainId;
        
        emit PropertyRegistered(
            blockchainId,
            _propertyId,
            _propertyName,
            msg.sender
        );

        return blockchainId;
    }

    function getProperty(address blockchainId) public view returns (
        string memory propertyId,
        string memory propertyName,
        string memory location,
        string memory propertyType,
        address owner,
        uint256 registrationDate,
        bool isVerified,
        uint256 lastTransferDate
    ) {
        Property storage prop = properties[blockchainId];
        require(bytes(prop.propertyId).length > 0, "Property not found");
        
        return (
            prop.propertyId,
            prop.propertyName,
            prop.location,
            prop.propertyType,
            prop.owner,
            prop.registrationDate,
            prop.isVerified,
            prop.lastTransferDate
        );
    }

    function verifyProperty(address blockchainId) public {
        require(bytes(properties[blockchainId].propertyId).length > 0, "Property not found");
        properties[blockchainId].isVerified = true;
        emit PropertyVerified(blockchainId);
    }

    function transferOwnership(address blockchainId, address newOwner) public {
        require(bytes(properties[blockchainId].propertyId).length > 0, "Property not found");
        require(properties[blockchainId].owner == msg.sender, "Not the owner");
        require(newOwner != address(0), "Invalid new owner");

        address previousOwner = properties[blockchainId].owner;
        properties[blockchainId].owner = newOwner;
        properties[blockchainId].lastTransferDate = block.timestamp;

        emit OwnershipTransferred(
            blockchainId,
            previousOwner,
            newOwner,
            block.timestamp
        );
    }
}