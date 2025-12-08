// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EventEmitter {

    event SecurityEvent(
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        string message,
        uint256 timestamp,
        uint256 blockNumber,
        uint256 gasPrice,
        uint256 nonce,     // This should be tx.origin.balance (uint256)
        address origin,    // This should be tx.origin (address)
        uint256 chainId,
        uint256 value
    );

    // Make function payable to allow sending ETH
    function sendTransaction(address receiver, uint256 amount, string memory message) external payable {
        emit SecurityEvent(
            msg.sender,
            receiver,
            amount,
            message,
            block.timestamp,
            block.number,
            tx.gasprice,
            tx.origin.balance, 
            tx.origin,         
            block.chainid,
            msg.value
        );
    }
}