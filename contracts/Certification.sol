pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

contract Certification {

    struct Record {
        uint recordId;
        address ownerAddress;

        bytes32 latlong;
        bytes32 date;
        bytes32 price;
        uint weight;
        uint quantity;
        bool conformity;

        uint sellerRecordId;
        address sellerAddress;
    }

    mapping(address => Record[]) public ownerRecords;  // map owner address to record
    mapping(uint => Record) public records;            // map record id to record
    mapping(uint => uint) public recordIdToNext;            // map record to its next record in the supply chain

    uint public recordCount = 1;

    // Adds record 
    // The record owner will be set to the address that calls this methode
    function addRecord (bytes32 latlong, bytes32 date, uint weight, uint quantity, bool conformity) public {

        // create a new record
        address sellerAddress;
        uint sellerRecordId = 0;

        bytes32 price = "0USD";


        records[recordCount] = Record(recordCount, msg.sender, latlong, date, price, weight, quantity, conformity, sellerRecordId, sellerAddress);
        ownerRecords[msg.sender].push(
            Record(recordCount, msg.sender, latlong, date, price, weight, quantity, conformity, sellerRecordId, sellerAddress)
        );

        recordCount++;
    }

    // Transfers record (if the sender is the owner of the record)
    // A new record will be created. The given buyerAddress will be the owner of the new record.
    function transferRecord (uint recordId, address buyerAddress, bytes32 latlong, bytes32 date, bytes32 price, uint weight, uint quantity) public {
        
        // check if the issuer address is the owner of the record that is transferred
        require(records[recordId].ownerAddress == msg.sender, 
            "You are not the owner of this record");   

        // check if total weight is valid
        require(records[recordId].weight * records[recordId].quantity >= weight * quantity, 
            "The total weight of the cocoa product can not increase through a transaction"); 

        // create a new record
        address sellerAddress = msg.sender;
        bool conformity = records[recordId].conformity;

        records[recordCount] = Record(recordCount, buyerAddress, latlong, date, price, weight, quantity, conformity, recordId, sellerAddress);
        ownerRecords[buyerAddress].push(
            Record(recordCount, buyerAddress, latlong, date, price, weight, quantity, conformity, recordId, sellerAddress)
        );

        recordIdToNext[recordId] = recordCount;
        recordCount++;
    }

    function getOwnerRecordCount(address _owner) public view returns (uint count) {
        return ownerRecords[_owner].length;
    }

    function getBaseRecordId(uint recordId) public view returns (uint count) {
        
        uint result = recordId;
        while (recordId > 0) {
            result = recordId;
            recordId = records[recordId].sellerRecordId;
        }

        return result;
    }

    constructor() public {
    }
}