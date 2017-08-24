// Remittance Contract Practice

pragma solidity ^0.4.6;

contract Remittance {
  address     public owner;
  bool        public contractDead;
  
  struct DepositStruct {
    address  authDepositor;
    uint     deadlineToWithdraw;
    uint     limitOfDeadline;
    uint     amountOfDeposit;
  }
  
  mapping(bytes32 => DepositStruct) public depositsStruct;
  
  event LogDataOfTransaction(address addressOfSender, uint amountDeposited, bytes32 generated2FAHash);
  event LogDataOfWithdrawal(address addressOfApplicant, uint amountWithdrawn);

  function Remittance()
  {
    // The owner is going to receive the commission
    owner = msg.sender;
  }
  
  function depositFunds(bytes8 passNumber1, bytes8 passNumber2, uint establishDeadline, uint establishDeadlineLimit) 
    public payable
    returns(bool successTransaction)
  {
    if(passNumber1 == '' || passNumber2 == '') throw;
    if(establishDeadline == 0 || establishDeadlineLimit == 0) throw;
    if(msg.value == 0) throw;  
      
    // Receive the two passwords and return to the owner the hash of the information
    // I make this in order to build the struct and because 
    // maybe the person doesn't have a tool to generate it
    bytes32 pass2FAHash = keccak256(passNumber1, passNumber2);
    
    depositsStruct[pass2FAHash].authDepositor = msg.sender;
    // This number indicates that, after this deadline, the sender can claim the ethers that were not withdrawal 
    depositsStruct[pass2FAHash].deadlineToWithdraw = block.number + establishDeadline;
    // This number indicates the deadline that have the sender to claim those ethers
    depositsStruct[pass2FAHash].limitOfDeadline = establishDeadline + establishDeadlineLimit;
    depositsStruct[pass2FAHash].amountOfDeposit = msg.value;
    
    LogDataOfTransaction(msg.sender, msg.value, pass2FAHash);
    return true;
  }
  
  function withdrawFunds(bytes8 passEnteredNumber1, bytes8 passEnteredNumber2) 
    public
    returns(bool successWithdrawal)
  {
    if(passEnteredNumber1 == '' || passEnteredNumber2 == '') throw;
    
    // Hashing the information of the two password that were sent
    bytes32 hashPassEntered = keccak256(passEnteredNumber1, passEnteredNumber2);
    
    // If the amount is 0, the withdrawal was already done, so is not authorized and they have
    // to use other data
    if(depositsStruct[hashPassEntered].amountOfDeposit == 0) throw;
    // If the deadline already pass, is not a success withdrawal
    if(depositsStruct[hashPassEntered].deadlineToWithdraw < block.number) throw;
    
    // Avoid a reentrance of the same data next time
    uint amountWithdrawn = depositsStruct[hashPassEntered].amountOfDeposit;
    depositsStruct[hashPassEntered].amountOfDeposit = 0;
    
    if(!msg.sender.send(amountWithdrawn)) throw;
    
    LogDataOfWithdrawal(msg.sender, amountWithdrawn);
    return true;
  }
  
  function withdrawRemainedFunds(bytes32 pass2FAHash) 
    public
    returns(bool successWithdrawal)
  {
    // This method only applies to the owner of the contract
    if(msg.sender != owner) throw;
    
    // Suppose that the owner keep the hash of the two passwords in a secure place.
    // To do this operation, he already have this data since the contract gave
    // this information in the deposit operation
    if(depositsStruct[pass2FAHash].amountOfDeposit == 0) throw;
    // If the deadline is not reach yet, throw
    if(depositsStruct[pass2FAHash].deadlineToWithdraw >= block.number) throw;
    // If the limit deadline already passed, throw
    if(depositsStruct[pass2FAHash].limitOfDeadline < block.number) throw;
    
    uint amountWithdrawn = depositsStruct[pass2FAHash].amountOfDeposit;
    depositsStruct[pass2FAHash].amountOfDeposit = 0;
    
    if(!msg.sender.send(amountWithdrawn)) throw;
    
    LogDataOfWithdrawal(msg.sender, amountWithdrawn);
    return true;
  }
    
  function setContractState(bool stateOfContract)
    public 
    returns(bool isContractAlive)
  {
    if(msg.sender != owner) throw;
    contractDead = stateOfContract;
    return !contractDead;
  }

  function() { throw; }   
}