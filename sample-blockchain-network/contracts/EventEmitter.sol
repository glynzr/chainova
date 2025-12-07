// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EventEmitter {
    event TransactionEvent(address indexed from, address indexed to, uint256 value, string message);

    function sendTransaction(address to, uint256 value, string memory message) public {
        emit TransactionEvent(msg.sender, to, value, message);
    }
}
