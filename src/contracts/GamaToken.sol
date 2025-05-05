// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract GamaCoin is ERC20, AccessControl, Pausable, ERC20Burnable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant SUB_ADMIN_ROLE = keccak256("SUB_ADMIN_ROLE");

    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;
    mapping(address => bool) public isBlacklisted;
    mapping(address => uint256) public subAdminMinted;
    mapping(address => uint256) public subAdminMintLimit;

    event Blacklisted(address indexed account, bool value);
    event SubAdminLimitUpdated(address indexed subAdmin, uint256 newLimit);

    constructor() ERC20("Gama Coin", "GAMA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mint(address to, uint256 amount) public whenNotPaused {
        require(!isBlacklisted[to], "Recipient is blacklisted");
        require(!isBlacklisted[msg.sender], "Sender is blacklisted");
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");

        if (hasRole(SUB_ADMIN_ROLE, msg.sender)) {
            uint256 newMintedAmount = subAdminMinted[msg.sender] + amount;
            require(newMintedAmount <= subAdminMintLimit[msg.sender], "Sub-admin mint limit exceeded");
            subAdminMinted[msg.sender] = newMintedAmount;
        } else {
            require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter or sub-admin");
        }

        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20) {
        require(!paused(), "Token transfer while paused");
        require(!isBlacklisted[from], "Sender is blacklisted");
        require(!isBlacklisted[to], "Recipient is blacklisted");
        super._update(from, to, value);
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        require(!isBlacklisted[msg.sender], "Approver is blacklisted");
        require(!isBlacklisted[spender], "Spender is blacklisted");
        return super.approve(spender, amount);
    }

    function increaseAllowance(address spender, uint256 addedValue) public override returns (bool) {
        require(!isBlacklisted[msg.sender], "Sender is blacklisted");
        require(!isBlacklisted[spender], "Spender is blacklisted");
        return super.increaseAllowance(spender, addedValue);
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public override returns (bool) {
        require(!isBlacklisted[msg.sender], "Sender is blacklisted");
        require(!isBlacklisted[spender], "Spender is blacklisted");
        return super.decreaseAllowance(spender, subtractedValue);
    }

    function burn(uint256 amount) public override {
        require(!isBlacklisted[msg.sender], "Caller is blacklisted");
        super.burn(amount);
    }

    function burnFrom(address account, uint256 amount) public override {
        require(!isBlacklisted[account], "Account is blacklisted");
        super.burnFrom(account, amount);
    }

    function setBlacklist(address account, bool value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isBlacklisted[account] = value;
        emit Blacklisted(account, value);
    }

    function setSubAdminLimit(address subAdmin, uint256 limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        subAdminMintLimit[subAdmin] = limit;
        emit SubAdminLimitUpdated(subAdmin, limit);
    }
}
