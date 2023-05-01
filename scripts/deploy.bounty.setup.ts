import { Contract } from "ethers";
import hre, { ethers } from "hardhat";
import path from "path";
import fs from "fs/promises";
// @ts-ignore
import { FacetCutAction, getSelectors } from "../utils/diamond";
import { ZERO_BYTES, networkConfig } from "../utils/common";
import {
  ADDRESS_GELATO_AUTOBOT,
  MINIMUM_DEPOSIT_AMOUNT,
  MINIMUM_FLOW_AMOUNT,
  MAX_FLOW_DURATION_PER_UNIT_FLOW_AMOUNT,
  MIN_CONTRACT_GELATO_BALANCE,
  ST_BUFFER_DURATION_IN_SECONDS,
  ST_ADDRESSES,
} from "../test/common.test";

async function isExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeFile(filePath: string, data: any) {
  try {
    const dirname = path.dirname(filePath);
    const exist = await isExists(dirname);
    if (!exist) {
      await fs.mkdir(dirname, { recursive: true });
    }

    await fs.appendFile(filePath, data, "utf8");
  } catch (err: any) {
    throw new Error(err);
  }
} // ref: https://stackoverflow.com/a/65615651

const simpleDeploy = async (
  contractName: string,
  args: any[],
  chainId: number,
  timestamp: number,
  isTest: boolean = false
) => {
  const [deployer] = await ethers.getSigners();

  const fContract = await ethers.getContractFactory(contractName, deployer);
  const ctContract = await fContract.deploy(...args);
  await ctContract.deployed(); // vs await ctLoupe.deployTransaction.wait(1); | ref: https://github.com/ethers-io/ethers.js/discussions/1577#discussioncomment-764711

  const dir = "./addresses";
  const file = `${dir}/${networkConfig[chainId]["name"]}_${timestamp}.txt`;
  try {
    if (!isTest)
      await writeFile(file, `${ctContract.address} - ${contractName}\n`);
  } catch (error: any) {
    console.error(error);
  }

  return ctContract;
};

const addFacetCutProcedure = (contractFacets: Contract[]) => {
  const facetCutProcedures = [];

  for (let i = 0; i < contractFacets.length; i++) {
    const contractFacet = contractFacets[i];
    facetCutProcedures.push({
      facetAddress: contractFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(contractFacet),
    });
  }

  return facetCutProcedures;
};

export async function main(isTest: boolean = false) {
  const now = Date.now();

  const [deployer] = await ethers.getSigners();

  const chainId = hre.network.config.chainId;
  console.log("On Chain:", chainId);

  if (!chainId) return;

  // ------------------------- //
  // ----- deploy facets ----- //
  // ------------------------- //

  const ctLoupe = await simpleDeploy("Loupe", [], chainId, now, isTest);
  const ctCut = await simpleDeploy("Cut", [], chainId, now, isTest);
  const ctAccessControl = await simpleDeploy(
    "AccessControl",
    [],
    chainId,
    now,
    isTest
  );
  const ctUtility = await simpleDeploy("Utility", [], chainId, now, isTest);
  const ctAutomate = await simpleDeploy("Automate", [], chainId, now, isTest);
  const ctFlowSetup = await simpleDeploy("FlowSetup", [], chainId, now, isTest);
  const ctFlow = await simpleDeploy("Flow", [], chainId, now, isTest);
  const ctDiamond = await simpleDeploy(
    "Diamond",
    [deployer.address, ctCut.address],
    chainId,
    now,
    isTest
  );

  // Note: the contracts deployed above may be optionally verified

  // ---------------------------------------- //
  // ----- prepare facet cut procedures ----- //
  // ---------------------------------------- //

  const facetCutProcedures = addFacetCutProcedure([
    ctLoupe,
    ctAccessControl,
    ctUtility,
    ctAutomate,
    ctFlowSetup,
    ctFlow,
  ]);

  // ----------------------- //
  // ----- cut diamond ----- //
  // ----------------------- //

  const fDiamondInit = await ethers.getContractFactory("DiamondInit", deployer);
  const ctDiamondInit = await fDiamondInit.deploy();
  await ctDiamondInit.deployed();

  const addressesSuperTokens = [networkConfig[chainId]["addrUSDCx"]];
  console.log(addressesSuperTokens);
  let initParams = [
    networkConfig[chainId]["addrGelAutobot"], // address _autobot,
    ethers.utils.parseEther("1"), // uint96 _minimumDepositAmount, (minimum claim-able by winner)
    ethers.utils.parseEther("1"), // uint96 _minimumFlowAmount, (minimum flowable amount per unit flow duration)
    "2592000", // uint96 _maxFlowDurationPerUnitFlowAmount, (2592000 = 1 month in seconds)
    ethers.utils.parseEther("1"), // uint256 _minimumContractGelatoBalance,
    "60", // uint256 _STBufferDurationInSecond, (in case of emergency where contract lack of supertoken funds, this is the duration at which it will last before contract loses it deposit -- DANGER)
    addressesSuperTokens, // ISuperToken[] memory _superTokens
  ] as any;

  if (isTest) {
    initParams = [
      ADDRESS_GELATO_AUTOBOT,
      MINIMUM_DEPOSIT_AMOUNT,
      MINIMUM_FLOW_AMOUNT,
      MAX_FLOW_DURATION_PER_UNIT_FLOW_AMOUNT,
      MIN_CONTRACT_GELATO_BALANCE,
      ST_BUFFER_DURATION_IN_SECONDS,
      ST_ADDRESSES,
    ] as any;
    console.log(
      "|| THIS DEPLOYMENT IS USING TEST PARAMETERS TO INITIALIZE DIAMOND CONTRACT ||"
    );
  }

  const encodedFunctionData = ctDiamondInit.interface.encodeFunctionData(
    "init",
    initParams
  );

  const ctDiamondCut = await ethers.getContractAt(`ICut`, ctDiamond.address); // call cut functionalities using main diamond address

  console.log("--- 💎 Diamond Cutting ");
  const tx = await ctDiamondCut.diamondCut(
    facetCutProcedures,
    ctDiamondInit.address, // ethers.constants.AddressZero,
    encodedFunctionData // ZERO_BYTES
  );
  const rcpt = await tx.wait();
  if (!rcpt.status) {
    throw Error(`!!! Diamond Cut Failed: ${tx.hash}`);
  }
  console.log("--- ✅ Cut Completed:", ctDiamond.address);

  // -------------------------- //
  // ----- verify example ----- //
  // -------------------------- //

  //   try {
  //     await hre.run("verify:verify", {
  //       // https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#using-programmatically
  //       address: contractAddress,
  //       constructorArguments: [], // empty for all facets except main Diamond contract deployed initially
  //       contract: contractPathVerify, // contractPath:contractName
  //     });
  //   } catch (err) {
  //     console.log(err);
  //   }
  //
  // contractPath = "parent_folder/contracts/.../ContractName.sol"
  // contractPath = "contracts/bounty_diamond/facets/core/Automate.sol" <-- example

  return ctDiamond;
}
