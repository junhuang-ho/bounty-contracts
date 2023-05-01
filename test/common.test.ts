import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { type SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, type BigNumber } from "ethers";
import hre, { ethers } from "hardhat";
import { main as deployBounty } from "../scripts/deploy.bounty.setup";
import { ZERO_BYTES, networkConfig } from "../utils/common";

const chainId = hre.network.config.chainId;
const CHAIN_ID_MUMBAI = 80001;
export const ADDRESS_GELATO_AUTOBOT =
  networkConfig[chainId ?? CHAIN_ID_MUMBAI]["addrGelAutobot"];
// export const MINIMUM_DEPOSIT_AMOUNT = ethers.utils.parseEther("3"); // 1
export const MINIMUM_FLOW_AMOUNT = ethers.utils.parseEther("2"); // 2
export const MINIMUM_DEPOSIT_AMOUNT = MINIMUM_FLOW_AMOUNT.sub(
  ethers.utils.parseEther("1")
);
export const MAX_FLOW_DURATION_PER_UNIT_FLOW_AMOUNT = 4092000; // 2592000 = 1 month in seconds
export const MIN_CONTRACT_GELATO_BALANCE = ethers.utils.parseEther("0.5");
export const ST_BUFFER_DURATION_IN_SECONDS = 3600;
export const ST_ADDRESSES = [
  networkConfig[chainId ?? CHAIN_ID_MUMBAI]["addrUSDCx"],
];
