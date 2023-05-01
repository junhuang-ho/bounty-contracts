import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { type SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, type BigNumber } from "ethers";
import hre, { ethers } from "hardhat";
import { main as deployBounty } from "../scripts/deploy.bounty.setup";
import { ZERO_BYTES, networkConfig } from "../utils/common";

import ISuperfluid from "@superfluid-finance/ethereum-contracts/build/contracts/ISuperfluid.json";
import ISuperToken from "@superfluid-finance/ethereum-contracts/build/contracts/ISuperToken.json";
import IConstantFlowAgreementV1 from "@superfluid-finance/ethereum-contracts/build/contracts/IConstantFlowAgreementV1.json";

const ABI_SF_HOST = ISuperfluid.abi;
const ABI_SUPERTOKEN = ISuperToken.abi;
const ABI_CFAV1 = IConstantFlowAgreementV1.abi;
import TaskTreasuryUpgradableABI from "../contracts/bounty_diamond/services/gelato/TaskTreasuryUpgradableABI.json";
import OpsImplementationABI from "../contracts/bounty_diamond/services/gelato/OpsImplementationABI.json";
import ABI_ERC20 from "../contracts/bounty_diamond/services/superfluid/ERC20_ABI.json";

const amGelatoFee = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const amAutobotFactory = "0xC815dB16D4be6ddf2685C201937905aBf338F5D7";
const GELATO_FEE = ethers.utils.parseEther("0.1");

// const chainId = hre.network.config.chainId;
// const CHAIN_ID_MUMBAI = 80001;
// export const ADDRESS_GELATO_AUTOBOT =
//   networkConfig[chainId ?? CHAIN_ID_MUMBAI]["addrGelAutobot"];
// // export const MINIMUM_DEPOSIT_AMOUNT = ethers.utils.parseEther("3"); // 1
// export const MINIMUM_FLOW_AMOUNT = ethers.utils.parseEther("2"); // 2
// export const MINIMUM_DEPOSIT_AMOUNT = MINIMUM_FLOW_AMOUNT.sub(
//   ethers.utils.parseEther("1")
// );
// export const MAX_FLOW_DURATION_PER_UNIT_FLOW_AMOUNT = 4092000; // 2592000 = 1 month in seconds
// export const MIN_CONTRACT_GELATO_BALANCE = ethers.utils.parseEther("0.5");
// export const ST_BUFFER_DURATION_IN_SECONDS = 3600;
// export const ST_ADDRESSES = [
//   networkConfig[chainId ?? CHAIN_ID_MUMBAI]["addrUSDCx"],
// ];

import {
  ADDRESS_GELATO_AUTOBOT,
  MINIMUM_DEPOSIT_AMOUNT,
  MINIMUM_FLOW_AMOUNT,
  MAX_FLOW_DURATION_PER_UNIT_FLOW_AMOUNT,
  MIN_CONTRACT_GELATO_BALANCE,
  ST_BUFFER_DURATION_IN_SECONDS,
  ST_ADDRESSES,
} from "./common.test";

describe("Bounty", () => {
  const encodeTimeArgs = (startTime: number, interval: number) => {
    const encoded = ethers.utils.defaultAbiCoder.encode(
      ["uint128", "uint128"],
      [startTime, interval]
    );

    return encoded;
  };

  const makeRich = async (signers: SignerWithAddress[], chainId: number) => {
    const amount = ethers.utils.parseEther("1000");

    for (let i = 0; i < signers.length; i++) {
      const ctUSDC = await ethers.getContractAt(
        ABI_ERC20,
        networkConfig[chainId]["addrUSDC"],
        signers[i]
      );

      const ctUSDCx = await ethers.getContractAt(
        ABI_SUPERTOKEN,
        networkConfig[chainId]["addrUSDCx"],
        signers[i]
      );

      var tx = await ctUSDC.mint(signers[i].address, amount);
      var rcpt = await tx.wait();

      var tx = await ctUSDC.approve(ctUSDCx.address, amount);
      var rcpt = await tx.wait();

      var tx = await ctUSDCx.upgrade(amount);
      var rcpt = await tx.wait();
    }
  };

  const fundContractWithNativeGas = async (
    contractAddress: string,
    amount: BigNumber
  ) => {
    const [deployer] = await ethers.getSigners();

    await deployer.sendTransaction({ value: amount, to: contractAddress });
  };

  const fundBountyContractGelatoTresury = async (
    chainId: number,
    amBounty: string,
    amount: BigNumber
  ) => {
    const [deployer, client1] = await ethers.getSigners();

    // const ctGelatoTreasury = new ethers.Contract(
    //   networkConfig[chainId]["addrGelTreasury"],
    //   TaskTreasuryUpgradableABI,
    //   deployer
    // );

    // var tx = await ctGelatoTreasury.depositFunds(
    //   amBounty,
    //   amGelatoFee,
    //   amount,
    //   { value: amount }
    // );
    // var rcpt = await tx.wait();

    const ctAutomateClient1 = await ethers.getContractAt(
      "Automate",
      amBounty,
      client1
    );

    var tx = await ctAutomateClient1.depositGelatoFunds({ value: amount });
    var rcpt = await tx.wait();
  };

  const approveDepositClientSTFundsToContract = async (
    client: SignerWithAddress,
    contractAddress: string,
    amountBounty: BigNumber,
    chainId: number
  ) => {
    const ctUSDCxClient = await ethers.getContractAt(
      ABI_SUPERTOKEN,
      networkConfig[chainId]["addrUSDCx"],
      client
    );

    var tx = await ctUSDCxClient.approve(contractAddress, amountBounty);
    var rcpt = await tx.wait();
  };

  const prefundSTToBountyContract = async (
    contractAddress: string,
    amount: BigNumber,
    chainId: number
  ) => {
    const [deployer] = await ethers.getSigners();

    const ctUSDCx = await ethers.getContractAt(
      ABI_SUPERTOKEN,
      networkConfig[chainId]["addrUSDCx"],
      deployer
    );

    var tx = await ctUSDCx.transfer(contractAddress, amount);
    var rcpt = await tx.wait();
  };

  const withdrawSTFromBountyContract = async (
    contractAddress: string,
    amount: BigNumber,
    chainId: number
  ) => {
    const [deployer] = await ethers.getSigners();

    const ctFlowSetup = await ethers.getContractAt(
      "FlowSetup",
      contractAddress,
      deployer
    );

    var tx = await ctFlowSetup.withdrawSuperToken(
      networkConfig[chainId]["addrUSDCx"],
      amount
    );
    var rcpt = await tx.wait();
  };

  const checkRoleValidity = async (
    amBounty: string,
    signer: SignerWithAddress,
    role: string,
    shouldBe: boolean,
    isAdmin: boolean = false
  ) => {
    const ctAccessControl = await ethers.getContractAt(
      "AccessControl",
      amBounty,
      signer
    );
    let roleHex;
    if (isAdmin) {
      roleHex = ctAccessControl.getDefaultAdminRole();
    } else {
      roleHex = await ctAccessControl.getRole(role);
    }
    const isRole = await ctAccessControl.hasRole(roleHex, signer.address);
    expect(isRole).to.be.equal(shouldBe);
  };

  const init = async () => {
    const [deployer, client1, client2, worker1, worker2] =
      await ethers.getSigners();

    const chainId = hre.network.config.chainId;
    console.log("On Chain:", chainId);

    if (!chainId) return;
    await makeRich([deployer, client1, client2, worker1, worker2], chainId);

    const ctBounty = await deployBounty(true);
    if (!ctBounty) return;
    const amBounty = ctBounty.address;

    const ctUtilityDeployer = await ethers.getContractAt(
      "Utility",
      amBounty,
      deployer
    );
    const ctUtilityClient1 = await ethers.getContractAt(
      "Utility",
      amBounty,
      client1
    );
    const ctAccessControlDeployer = await ethers.getContractAt(
      "AccessControl",
      amBounty,
      deployer
    );
    const ctAccessControlClient1 = await ethers.getContractAt(
      "AccessControl",
      amBounty,
      client1
    );
    const ctAutomateDeployer = await ethers.getContractAt(
      "Automate",
      amBounty,
      deployer
    );
    const ctAutomateClient1 = await ethers.getContractAt(
      "Automate",
      amBounty,
      client1
    );
    const ctFlowSetupDeployer = await ethers.getContractAt(
      "FlowSetup",
      amBounty,
      deployer
    );
    const ctFlowSetupClient1 = await ethers.getContractAt(
      "FlowSetup",
      amBounty,
      client1
    );
    const ctFlowClient1 = await ethers.getContractAt("Flow", amBounty, client1);

    const ctCFAV1 = await ethers.getContractAt(
      ABI_CFAV1,
      networkConfig[chainId]["addrCFAV1"],
      deployer
    );

    const ctUSDCx = await ethers.getContractAt(
      ABI_SUPERTOKEN,
      networkConfig[chainId]["addrUSDCx"],
      deployer
    );
    const ctGelatoTreasury = new ethers.Contract(
      networkConfig[chainId]["addrGelTreasury"],
      TaskTreasuryUpgradableABI,
      deployer
    );

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [networkConfig[chainId]["addrGelNet"]],
    });
    const gelatoExecutor = ethers.provider.getSigner(
      networkConfig[chainId]["addrGelNet"]
    );

    const ctGelatoAutoBot = new ethers.Contract(
      networkConfig[chainId]["addrGelAutobot"],
      OpsImplementationABI,
      gelatoExecutor
    );

    const ctFlowGelatoExecutor = await ethers.getContractAt(
      "Flow",
      amBounty,
      gelatoExecutor
    );

    return {
      chainId,
      ctUtilityDeployer,
      ctUtilityClient1,
      ctAccessControlDeployer,
      ctAccessControlClient1,
      ctAutomateDeployer,
      ctAutomateClient1,
      ctFlowSetupDeployer,
      ctFlowSetupClient1,
      ctFlowClient1,
      ctFlowGelatoExecutor,
      ctCFAV1,
      ctUSDCx,
      ctGelatoTreasury,
      ctGelatoAutoBot,
      gelatoExecutor,
      amBounty,
      deployer,
      client1,
      client2,
      worker1,
      worker2,
    };
  };

  describe("deployment", async () => {
    it("Should deploy and set initial values correctly", async () => {
      const result = await loadFixture(init);
      if (!result) {
        expect(true).to.be.equal(false);
        return;
      }
      const {
        chainId,
        ctAutomateClient1,
        ctFlowSetupClient1,
        amBounty,
        deployer,
        client1,
      } = result;

      // TODO: diamond / cut / loupe test separately (diamondTest.js)

      await checkRoleValidity(amBounty, deployer, "", true, true);
      await checkRoleValidity(amBounty, deployer, "MAINTAINER_ROLE", true);
      await checkRoleValidity(amBounty, deployer, "TREASURER_ROLE", true);
      await checkRoleValidity(amBounty, deployer, "STRATEGIST_ROLE", true);
      await checkRoleValidity(amBounty, deployer, "DEVELOPER_ROLE", false);

      await checkRoleValidity(amBounty, client1, "", false, true);
      await checkRoleValidity(amBounty, client1, "MAINTAINER_ROLE", false);
      await checkRoleValidity(amBounty, client1, "TREASURER_ROLE", false);
      await checkRoleValidity(amBounty, client1, "STRATEGIST_ROLE", false);
      await checkRoleValidity(amBounty, client1, "DEVELOPER_ROLE", false);

      const gelatoAddresses = await ctAutomateClient1.getGelatoAddresses();
      expect(gelatoAddresses[0]).to.be.equal(ADDRESS_GELATO_AUTOBOT);
      expect(gelatoAddresses[1]).to.be.equal(
        networkConfig[chainId]["addrGelTreasury"]
      );
      expect(gelatoAddresses[2]).to.be.equal(
        networkConfig[chainId]["addrGelNet"]
      );
      expect(gelatoAddresses[3]).to.be.equal(amAutobotFactory);
      expect(gelatoAddresses[4]).to.be.equal(amGelatoFee);

      expect(await ctAutomateClient1.getMinContractGelatoBalance()).to.be.equal(
        MIN_CONTRACT_GELATO_BALANCE
      );

      expect(
        await ctFlowSetupClient1.isSuperTokensSupported(ST_ADDRESSES[0])
      ).to.be.equal(true);
      expect(
        await ctFlowSetupClient1.isSuperTokensSupported(
          networkConfig[chainId]["addrDAIx"]
        )
      ).to.be.equal(false);

      expect(await ctFlowSetupClient1.getMinimumDepositAmount()).to.be.equal(
        MINIMUM_DEPOSIT_AMOUNT
      );
      expect(await ctFlowSetupClient1.getMinimumFlowAmount()).to.be.equal(
        MINIMUM_FLOW_AMOUNT
      );
      expect(
        await ctFlowSetupClient1.getMaxFlowDurationPerUnitFlowAmount()
      ).to.be.equal(MAX_FLOW_DURATION_PER_UNIT_FLOW_AMOUNT);
      expect(
        await ctFlowSetupClient1.getSTBufferDurationInSecond()
      ).to.be.equal(ST_BUFFER_DURATION_IN_SECONDS);
    });
  });

  describe("Utility", async () => {
    describe("getNativeBalance", async () => {
      it("Should get contract native balance", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctUtilityClient1, amBounty } = result;

        const amount = ethers.utils.parseEther("2");
        expect(await ctUtilityClient1.getNativeBalance()).to.be.equal(0);
        await fundContractWithNativeGas(amBounty, amount);
        expect(await ctUtilityClient1.getNativeBalance()).to.be.equal(amount);
      });
    });
    describe("withdrawNativeBalance", async () => {
      it("Should revert if caller not have role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctUtilityDeployer,
          ctUtilityClient1,
          ctAccessControlClient1,
          amBounty,
          client1,
        } = result;

        const roleHex = await ctAccessControlClient1.getRole("TREASURER_ROLE");
        const amount = ethers.utils.parseEther("2");
        const amount_ = ethers.utils.parseEther("1");
        await fundContractWithNativeGas(amBounty, amount);

        // await expect(
        //   ctUtilityClient1.withdrawNativeBalance(amount)
        // ).to.be.revertedWith(
        //   `AccessControl: account ${client1.address} is missing role ${roleHex}`
        // ); // note: for some reason this revert string does not match eventhough text is exact same

        await expect(
          ctUtilityClient1.withdrawNativeBalance(amount.sub(amount_))
        ).to.be.reverted;
      });
      it("Should revert if insufficient funds", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctUtilityDeployer,
          ctUtilityClient1,
          ctAccessControlClient1,
          amBounty,
          client1,
        } = result;

        const amount = ethers.utils.parseEther("2");
        const amount_ = ethers.utils.parseEther("1");
        await fundContractWithNativeGas(amBounty, amount);

        await expect(
          ctUtilityDeployer.withdrawNativeBalance(amount.add(amount_))
        ).to.be.revertedWithCustomError(
          ctUtilityDeployer,
          "FailedWithdrawNativeToken"
        );
      });
      it("Should withdraw native gas", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctUtilityDeployer,
          ctUtilityClient1,
          ctAccessControlClient1,
          amBounty,
          client1,
        } = result;

        const amount = ethers.utils.parseEther("2");
        const amount_ = ethers.utils.parseEther("1");
        await fundContractWithNativeGas(amBounty, amount);

        var tx = await ctUtilityDeployer.withdrawNativeBalance(
          amount.sub(amount_)
        );
        var rcpt = await tx.wait();

        expect(await ctUtilityDeployer.getNativeBalance()).to.be.equal(amount_);
      });
    });
  });

  describe("AccessControl", async () => {
    describe("getRoleAdmin", async () => {
      it("Should be admin role equal to default admin role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctAccessControlClient1, amBounty } = result;

        const roleHexAdmin = await ctAccessControlClient1.getDefaultAdminRole();
        const roleHexMaintainer = await ctAccessControlClient1.getRole(
          "MAINTAINER_ROLE"
        );
        const roleHexTreasurer = await ctAccessControlClient1.getRole(
          "TREASURER_ROLE"
        );
        const roleHexStrategist = await ctAccessControlClient1.getRole(
          "STRATEGIST_ROLE"
        );
        const roleHexDeveloper = await ctAccessControlClient1.getRole(
          "DEVELOPER_ROLE"
        );

        expect(
          await ctAccessControlClient1.getRoleAdmin(roleHexMaintainer)
        ).to.be.equal(roleHexAdmin);
        expect(
          await ctAccessControlClient1.getRoleAdmin(roleHexTreasurer)
        ).to.be.equal(roleHexAdmin);
        expect(
          await ctAccessControlClient1.getRoleAdmin(roleHexStrategist)
        ).to.be.equal(roleHexAdmin);
        expect(
          await ctAccessControlClient1.getRoleAdmin(roleHexDeveloper)
        ).to.be.equal(roleHexAdmin);
      });
    });
    describe("grantRole", async () => {
      it("Should revert if caller not admin of role being granted", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctAccessControlClient1, client1, worker1 } = result;

        const roleHexMaintainer = await ctAccessControlClient1.getRole(
          "MAINTAINER_ROLE"
        );
        await expect(
          ctAccessControlClient1.grantRole(roleHexMaintainer, client1.address)
        ).to.be.reverted;
        await expect(
          ctAccessControlClient1.grantRole(roleHexMaintainer, worker1.address)
        ).to.be.reverted;
      });
      it("Should grant user role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctAccessControlDeployer, client1 } = result;

        const roleHexMaintainer = await ctAccessControlDeployer.getRole(
          "MAINTAINER_ROLE"
        );

        expect(
          await ctAccessControlDeployer.hasRole(
            roleHexMaintainer,
            client1.address
          )
        ).to.be.equal(false);

        var tx = await ctAccessControlDeployer.grantRole(
          roleHexMaintainer,
          client1.address
        );
        var rcpt = await tx.wait();

        expect(
          await ctAccessControlDeployer.hasRole(
            roleHexMaintainer,
            client1.address
          )
        ).to.be.equal(true);
      });
    });
    describe("revokeRole", async () => {
      it("Should revert if caller not admin of role being revoked", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctAccessControlDeployer,
          ctAccessControlClient1,
          worker1,
        } = result;

        const roleHexMaintainer = await ctAccessControlDeployer.getRole(
          "MAINTAINER_ROLE"
        );

        var tx = await ctAccessControlDeployer.grantRole(
          roleHexMaintainer,
          worker1.address
        );
        var rcpt = await tx.wait();

        await expect(
          ctAccessControlClient1.revokeRole(roleHexMaintainer, worker1.address)
        ).to.be.reverted;
      });
      it("Should revoke user role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctAccessControlDeployer, client1 } = result;

        const roleHexMaintainer = await ctAccessControlDeployer.getRole(
          "MAINTAINER_ROLE"
        );

        var tx = await ctAccessControlDeployer.grantRole(
          roleHexMaintainer,
          client1.address
        );
        var rcpt = await tx.wait();

        expect(
          await ctAccessControlDeployer.hasRole(
            roleHexMaintainer,
            client1.address
          )
        ).to.be.equal(true);

        var tx = await ctAccessControlDeployer.revokeRole(
          roleHexMaintainer,
          client1.address
        );
        var rcpt = await tx.wait();

        expect(
          await ctAccessControlDeployer.hasRole(
            roleHexMaintainer,
            client1.address
          )
        ).to.be.equal(false);
      });
    });
    describe("renounceRole", async () => {
      it("Should renonce role of caller regardless of if caller have role or not", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctAccessControlDeployer,
          ctAccessControlClient1,
          client1,
        } = result;

        const roleHexMaintainer = await ctAccessControlDeployer.getRole(
          "MAINTAINER_ROLE"
        );

        expect(
          await ctAccessControlDeployer.hasRole(
            roleHexMaintainer,
            client1.address
          )
        ).to.be.equal(false);

        var tx = await ctAccessControlClient1.renounceRole(roleHexMaintainer);
        var rcpt = await tx.wait();

        expect(
          await ctAccessControlDeployer.hasRole(
            roleHexMaintainer,
            client1.address
          )
        ).to.be.equal(false);

        var tx = await ctAccessControlDeployer.grantRole(
          roleHexMaintainer,
          client1.address
        );
        var rcpt = await tx.wait();

        expect(
          await ctAccessControlDeployer.hasRole(
            roleHexMaintainer,
            client1.address
          )
        ).to.be.equal(true);

        var tx = await ctAccessControlClient1.renounceRole(roleHexMaintainer);
        var rcpt = await tx.wait();

        expect(
          await ctAccessControlDeployer.hasRole(
            roleHexMaintainer,
            client1.address
          )
        ).to.be.equal(false);
      });
    });
  });

  describe("Automate", async () => {
    describe("setGelatoContracts", async () => {
      it("Should revert if caller not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctAutomateClient1, client1 } = result;

        await expect(ctAutomateClient1.setGelatoContracts(amGelatoFee)).to.be
          .reverted;
      });
      it("Should set gelato contract"); // need proper autobot contract to test
    });
    describe("setMinContractGelatoBalance", async () => {
      it("Should revert if caller not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctAutomateClient1, client1 } = result;

        const amount = MIN_CONTRACT_GELATO_BALANCE.sub(
          ethers.utils.parseEther("0.0001")
        );
        await expect(ctAutomateClient1.setMinContractGelatoBalance(amount)).to
          .be.reverted;
      });
      it("Should set min contract gelato balance", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctAutomateDeployer, client1 } = result;

        expect(
          await ctAutomateDeployer.getMinContractGelatoBalance()
        ).to.be.equal(MIN_CONTRACT_GELATO_BALANCE);

        const amount = ethers.utils.parseEther("3");
        var tx = await ctAutomateDeployer.setMinContractGelatoBalance(amount);
        var rcpt = await tx.wait();
        expect(
          await ctAutomateDeployer.getMinContractGelatoBalance()
        ).to.be.equal(amount);
      });
    });
    describe("depositGelatoFunds", async () => {
      it("Should deposit contract gelato balance", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctGelatoTreasury, amBounty, client1 } = result;

        expect(
          await ctGelatoTreasury.userTokenBalance(amBounty, amGelatoFee)
        ).to.be.equal(0);

        const amount = ethers.utils.parseEther("2");
        await fundBountyContractGelatoTresury(chainId, amBounty, amount);

        expect(
          await ctGelatoTreasury.userTokenBalance(amBounty, amGelatoFee)
        ).to.be.equal(amount);
      });
    });
    describe("withdrawGelatoFunds", async () => {
      it("Should revert if caller not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctAutomateClient1, amBounty, client1 } = result;

        const amount = ethers.utils.parseEther("2");
        await fundBountyContractGelatoTresury(chainId, amBounty, amount);

        await expect(ctAutomateClient1.withdrawGelatoFunds(amount)).to.be
          .reverted;
      });
      it("Should withdraw gelato funds", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctGelatoTreasury,
          ctAutomateDeployer,
          amBounty,
          client1,
        } = result;

        const amount = ethers.utils.parseEther("2");
        await fundBountyContractGelatoTresury(chainId, amBounty, amount);

        expect(
          await ctGelatoTreasury.userTokenBalance(amBounty, amGelatoFee)
        ).to.be.equal(amount);

        const amount_ = ethers.utils.parseEther("1");

        var tx = await ctAutomateDeployer.withdrawGelatoFunds(amount_);
        var rcpt = await tx.wait();

        expect(
          await ctGelatoTreasury.userTokenBalance(amBounty, amGelatoFee)
        ).to.be.equal(amount.sub(amount_));
      });
    });
  });

  describe("FlowSetup", async () => {
    describe("setMinimumDepositAmount", async () => {
      it("Should revert if caller not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupClient1, amBounty, client1 } = result;

        const amount = ethers.utils.parseEther("3");
        await expect(ctFlowSetupClient1.setMinimumDepositAmount(amount)).to.be
          .reverted;
      });
      it("Should set min deposit amount", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupDeployer, amBounty, client1 } = result;

        expect(await ctFlowSetupDeployer.getMinimumDepositAmount()).to.be.equal(
          MINIMUM_DEPOSIT_AMOUNT
        );

        const amount = ethers.utils.parseEther("3");
        var tx = await ctFlowSetupDeployer.setMinimumDepositAmount(amount);
        var rcpt = await tx.wait();

        expect(await ctFlowSetupDeployer.getMinimumDepositAmount()).to.be.equal(
          amount
        );
      });
    });
    describe("setMinimumFlowAmount", async () => {
      it("Should revert if caller not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupClient1, amBounty, client1 } = result;

        const amount = ethers.utils.parseEther("3");
        await expect(ctFlowSetupClient1.setMinimumFlowAmount(amount)).to.be
          .reverted;
      });
      it("Should set min flow amount", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupDeployer, amBounty, client1 } = result;

        expect(await ctFlowSetupDeployer.getMinimumFlowAmount()).to.be.equal(
          MINIMUM_FLOW_AMOUNT
        );

        const amount = ethers.utils.parseEther("3");
        var tx = await ctFlowSetupDeployer.setMinimumFlowAmount(amount);
        var rcpt = await tx.wait();

        expect(await ctFlowSetupDeployer.getMinimumFlowAmount()).to.be.equal(
          amount
        );
      });
    });
    describe("setMaxFlowDurationPerUnitFlowAmount", async () => {
      it("Should revert if caller not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupClient1, amBounty, client1 } = result;

        const amount = 30000000;
        await expect(
          ctFlowSetupClient1.setMaxFlowDurationPerUnitFlowAmount(amount)
        ).to.be.reverted;
      });
      it("Should set max flow duration per min flow amount", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupDeployer, amBounty, client1 } = result;

        expect(
          await ctFlowSetupDeployer.getMaxFlowDurationPerUnitFlowAmount()
        ).to.be.equal(MAX_FLOW_DURATION_PER_UNIT_FLOW_AMOUNT);

        const amount = 30000000;
        var tx = await ctFlowSetupDeployer.setMaxFlowDurationPerUnitFlowAmount(
          amount
        );
        var rcpt = await tx.wait();

        expect(
          await ctFlowSetupDeployer.getMaxFlowDurationPerUnitFlowAmount()
        ).to.be.equal(amount);
      });
    });
    describe("setSTBufferAmount", async () => {
      it("Should revert if caller not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupClient1, amBounty, client1 } = result;

        const amount = 5555;
        await expect(ctFlowSetupClient1.setSTBufferAmount(amount)).to.be
          .reverted;
      });
      it("Should set supertoken buffer amount", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupDeployer, amBounty, client1 } = result;

        expect(
          await ctFlowSetupDeployer.getSTBufferDurationInSecond()
        ).to.be.equal(ST_BUFFER_DURATION_IN_SECONDS);

        const amount = 5555;
        var tx = await ctFlowSetupDeployer.setSTBufferAmount(amount);
        var rcpt = await tx.wait();

        expect(
          await ctFlowSetupDeployer.getSTBufferDurationInSecond()
        ).to.be.equal(amount);
      });
    });
    describe("addSuperToken", async () => {
      it("Should revert if not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupClient1, amBounty, client1 } = result;

        const supertoken = networkConfig[chainId]["addrDAIx"];
        await expect(ctFlowSetupClient1.addSuperToken(supertoken)).to.be
          .reverted;
      });
      it("Should add supertoken", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupDeployer, amBounty, client1 } = result;

        const supertoken = networkConfig[chainId]["addrDAIx"];

        expect(
          await ctFlowSetupDeployer.isSuperTokensSupported(supertoken)
        ).to.be.equal(false);

        var tx = await ctFlowSetupDeployer.addSuperToken(supertoken);
        var rcpt = await tx.wait();

        expect(
          await ctFlowSetupDeployer.isSuperTokensSupported(supertoken)
        ).to.be.equal(true);
      });
    });
    describe("removeSuperToken", async () => {
      it("Should revert if not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupClient1, amBounty, client1 } = result;

        const supertoken = networkConfig[chainId]["addrDAIx"];
        await expect(ctFlowSetupClient1.removeSuperToken(supertoken)).to.be
          .reverted;
      });
      it("Should remove supertoken", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupDeployer, amBounty, client1 } = result;

        const supertoken = networkConfig[chainId]["addrDAIx"];

        var tx = await ctFlowSetupDeployer.addSuperToken(supertoken);
        var rcpt = await tx.wait();

        expect(
          await ctFlowSetupDeployer.isSuperTokensSupported(supertoken)
        ).to.be.equal(true);

        var tx = await ctFlowSetupDeployer.removeSuperToken(supertoken);
        var rcpt = await tx.wait();

        expect(
          await ctFlowSetupDeployer.isSuperTokensSupported(supertoken)
        ).to.be.equal(false);
      });
    });
    describe("withdrawSuperToken", async () => {
      it("Should revert if not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupClient1, amBounty, client1 } = result;

        const supertoken = networkConfig[chainId]["addrDAIx"];
        const amount = ethers.utils.parseEther("5");
        await expect(ctFlowSetupClient1.withdrawSuperToken(supertoken, amount))
          .to.be.reverted;
      });
      it("Should revert if insufficient supertoken", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowSetupDeployer, amBounty, client1 } = result;

        const supertoken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("5");

        await expect(ctFlowSetupDeployer.withdrawSuperToken(supertoken, amount))
          .to.be.reverted;
      });
      it("Should withdraw supertoken", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowSetupDeployer,
          ctUSDCx,
          amBounty,
          deployer,
          client1,
        } = result;

        const supertoken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("5");

        const bal1Deployer1 = await ctUSDCx.balanceOf(deployer.address);

        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amount,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amount, chainId);

        expect(await ctUSDCx.balanceOf(amBounty)).to.be.equal(amount);

        const bal1Deployer2 = await ctUSDCx.balanceOf(deployer.address);
        expect(bal1Deployer2).to.be.equal(bal1Deployer1.sub(amount));

        const amount_ = ethers.utils.parseEther("3");
        var tx = await ctFlowSetupDeployer.withdrawSuperToken(
          supertoken,
          amount_
        );
        var rcpt = await tx.wait();

        expect(await ctUSDCx.balanceOf(amBounty)).to.be.equal(
          amount.sub(amount_)
        );

        const bal1Deployer3 = await ctUSDCx.balanceOf(deployer.address);
        expect(bal1Deployer3).to.be.equal(bal1Deployer2.add(amount_));
      });
    });
  });

  describe("Flow", async () => {
    describe("increaseFlow", async () => {
      it("Should revert if caller not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await expect(
          ctFlowClient1.increaseFlow(
            networkConfig[chainId]["addrUSDCx"],
            worker1.address,
            ethers.utils.parseEther("0.0001"),
            0
          )
        ).to.be.revertedWithCustomError(ctFlowClient1, "CallerNotAutobot");
      });
      //   it("Should create flow", async () => {});
      //   it("Should update flow", async () => {});
    });
    describe("decreaseFlow", async () => {
      it("Should revert if caller not role", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await expect(
          ctFlowClient1.decreaseFlow(
            networkConfig[chainId]["addrUSDCx"],
            worker1.address,
            ethers.utils.parseEther("0.0001"),
            0
          )
        ).to.be.revertedWithCustomError(ctFlowClient1, "CallerNotAutobot");
      });
      //   it("Should delete flow", async () => {});
      //   it("Should update flow", async () => {});
    });
    describe("openBounty", async () => {
      it("Should revert if insufficient gelato funds", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        const superToken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("0.5");
        const durationHold = 60;
        const durationFlow = 60;

        await expect(
          ctFlowClient1.openBounty(
            superToken,
            amount,
            amountMinimum,
            durationHold,
            durationFlow
          )
        ).to.be.revertedWithCustomError(
          ctFlowClient1,
          "InsufficientContractGelatoBalance"
        );
      });
      it("Should revert if invalid supertoken", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          MIN_CONTRACT_GELATO_BALANCE.add(ethers.utils.parseEther("0.0001"))
        );

        const superToken = networkConfig[chainId]["addrDAIx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;
        await expect(
          ctFlowClient1.openBounty(
            superToken,
            amount,
            amountMinimum,
            durationHold,
            durationFlow
          )
        ).to.be.revertedWithCustomError(ctFlowClient1, "InvalidSuperToken");
      });
      it("Should revert if insufficient minnimum amount", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const superToken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("0.9");
        const durationHold = 60;
        const durationFlow = 60;
        await expect(
          ctFlowClient1.openBounty(
            superToken,
            amount,
            amountMinimum,
            durationHold,
            durationFlow
          )
        ).to.be.revertedWithCustomError(
          ctFlowClient1,
          "InsufficientMinimumAmount"
        );
      });
      it("Should revert if minimum amount more than main/max amount", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const superToken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("5");
        const durationHold = 60;
        const durationFlow = 60;
        await expect(
          ctFlowClient1.openBounty(
            superToken,
            amount,
            amountMinimum,
            durationHold,
            durationFlow
          )
        ).to.be.revertedWithCustomError(ctFlowClient1, "InvalidMinimumAmount");
      });
      it("Should revert if insufficient flow amount", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const superToken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("1.5");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;
        await expect(
          ctFlowClient1.openBounty(
            superToken,
            amount,
            amountMinimum,
            durationHold,
            durationFlow
          )
        ).to.be.revertedWithCustomError(
          ctFlowClient1,
          "InsufficientFlowAmount"
        );
      });
      it("Should revert if hold duration is zero", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const superToken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 0;
        const durationFlow = 60;
        await expect(
          ctFlowClient1.openBounty(
            superToken,
            amount,
            amountMinimum,
            durationHold,
            durationFlow
          )
        ).to.be.revertedWithCustomError(ctFlowClient1, "ZeroDuration");
      });
      it("Should revert if flow duration is zero", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const superToken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 0;
        await expect(
          ctFlowClient1.openBounty(
            superToken,
            amount,
            amountMinimum,
            durationHold,
            durationFlow
          )
        ).to.be.revertedWithCustomError(ctFlowClient1, "ZeroDuration");
      });
      it("Should revert if flow duration too large", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const superToken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 999999999;
        await expect(
          ctFlowClient1.openBounty(
            superToken,
            amount,
            amountMinimum,
            durationHold,
            durationFlow
          )
        ).to.be.revertedWithCustomError(ctFlowClient1, "ExcessiveFlowDuration");
      });
      it("Should revert if insufficient contract supertoken balance", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const { chainId, ctFlowClient1, amBounty, client1, worker1 } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const superToken = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;
        await expect(
          ctFlowClient1.openBounty(
            superToken,
            amount,
            amountMinimum,
            durationHold,
            durationFlow
          )
        ).to.be.revertedWithCustomError(
          ctFlowClient1,
          "InsufficientContractSTBalance"
        );
      });
      it("Should initialize bounty, deposit supertoken, schedule tasks and iterate nonce", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctUSDCx,
          ctGelatoAutoBot,
          amBounty,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        const balContract1 = await ctUSDCx.balanceOf(amBounty);
        const balClient11 = await ctUSDCx.balanceOf(client1.address);

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIdFlowIncrease).to.be.equal(ethers.constants.HashZero);
        expect(taskIdFlowDecrease).to.be.equal(ethers.constants.HashZero);
        expect(timestampIncrease).to.be.equal(0);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(0);
        expect(depositAmountMinimum).to.be.equal(0);
        expect(flowRate).to.be.equal(0);
        expect(superToken).to.be.equal(ethers.constants.AddressZero);

        expect(await ctFlowClient1.getNonce(client1.address)).to.be.equal(0);

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);
        // const tsOpenBounty = await time.latest();

        const balContract2 = await ctUSDCx.balanceOf(amBounty);
        const balClient12 = await ctUSDCx.balanceOf(client1.address);
        expect(balContract2).to.be.equal(balContract1.add(amount));
        expect(balClient12).to.be.equal(balClient11.sub(amount));

        const taskIds = await ctGelatoAutoBot.getTaskIdsByUser(amBounty);

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIds.includes(taskIdFlowIncrease)).to.be.equal(true);
        expect(taskIds.includes(taskIdFlowDecrease)).to.be.equal(true);
        expect(timestampIncrease).to.be.equal(0);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(amount);
        expect(depositAmountMinimum).to.be.equal(amountMinimum);
        expect(flowRate).to.be.equal(flowRateOpenBounty);
        expect(superToken).to.be.equal(superToken_);

        expect(await ctFlowClient1.getNonce(client1.address)).to.be.equal(1);

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 1);
        expect(taskIdFlowIncrease).to.be.equal(ethers.constants.HashZero);
        expect(taskIdFlowDecrease).to.be.equal(ethers.constants.HashZero);
        expect(timestampIncrease).to.be.equal(0);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(0);
        expect(depositAmountMinimum).to.be.equal(0);
        expect(flowRate).to.be.equal(0);
        expect(superToken).to.be.equal(ethers.constants.AddressZero);
      });
      it("Should execute increaseFlow task", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctCFAV1,
          ctGelatoAutoBot,
          amBounty,
          gelatoExecutor,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        var rc = await ethers.provider.getTransactionReceipt(
          rcpt.transactionHash
        );
        var block = await ethers.provider.getBlock(rc.blockNumber);
        var startTime = block.timestamp;
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "increaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(startTime + durationHold, durationHold);
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(59); // ff time

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(0);
        expect(flowRateOutput).to.be.equal(0);
        expect(deposit).to.be.equal(0);
        expect(owedDeposit).to.be.equal(0);

        await ctGelatoAutoBot
          .connect(gelatoExecutor)
          .exec(
            amBounty,
            amBounty,
            execData,
            moduleData,
            GELATO_FEE,
            amGelatoFee,
            true,
            true
          );
        const tsStartFlow = await time.latest();

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(tsStartFlow);
        expect(flowRateOutput).to.be.equal(flowRateOpenBounty);
        expect(deposit).to.be.gt(flowRateOpenBounty.mul(60 * 60));
        expect(owedDeposit).to.be.equal(0);
      });
      it("Should execute decreaseFlow task", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctCFAV1,
          ctGelatoAutoBot,
          amBounty,
          gelatoExecutor,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        var rc = await ethers.provider.getTransactionReceipt(
          rcpt.transactionHash
        );
        var block = await ethers.provider.getBlock(rc.blockNumber);
        var startTime = block.timestamp;
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);
        // const tsOpenBounty = await time.latest();

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "increaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(startTime + durationHold, durationHold);
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(59); // ff time

        await ctGelatoAutoBot
          .connect(gelatoExecutor)
          .exec(
            amBounty,
            amBounty,
            execData,
            moduleData,
            GELATO_FEE,
            amGelatoFee,
            true,
            true
          );
        const tsStartFlow = await time.latest();

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "decreaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(
          startTime + durationHold + durationFlow,
          durationFlow
        );
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(57); // ff time

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(tsStartFlow);
        expect(flowRateOutput).to.be.equal(flowRateOpenBounty);
        expect(deposit).to.be.gt(flowRateOpenBounty.mul(60 * 60));
        expect(owedDeposit).to.be.equal(0);

        await ctGelatoAutoBot
          .connect(gelatoExecutor)
          .exec(
            amBounty,
            amBounty,
            execData,
            moduleData,
            GELATO_FEE,
            amGelatoFee,
            true,
            true
          );

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(0);
        expect(flowRateOutput).to.be.equal(0);
        expect(deposit).to.be.equal(0);
        expect(owedDeposit).to.be.equal(0);
      });
      it("Should fail to execute task if contract supertoken funds runs out", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctCFAV1,
          ctUSDCx,
          ctGelatoAutoBot,
          ctUtilityDeployer,
          amBounty,
          gelatoExecutor,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        var rc = await ethers.provider.getTransactionReceipt(
          rcpt.transactionHash
        );
        var block = await ethers.provider.getBlock(rc.blockNumber);
        var startTime = block.timestamp;
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "increaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(startTime + durationHold, durationHold);
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(50); // ff time

        const amountST_ = await ctUSDCx.balanceOf(amBounty);

        await withdrawSTFromBountyContract(amBounty, amountST_, chainId);

        expect(await ctUSDCx.balanceOf(amBounty)).to.be.equal(0);

        await time.increase(8); // ff time

        await expect(
          ctGelatoAutoBot
            .connect(gelatoExecutor)
            .exec(
              amBounty,
              amBounty,
              execData,
              moduleData,
              GELATO_FEE,
              amGelatoFee,
              true,
              true
            )
        ).to.be.reverted;
      });
      it("Should fail to execute task if contract gelato funds runs out");
    });
    describe("cancelBounty", async () => {
      it("Should return full amount to bounty caller if cancel before flow starts", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctCFAV1,
          ctUSDCx,
          ctGelatoAutoBot,
          amBounty,
          gelatoExecutor,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIdFlowIncrease).to.be.equal(ethers.constants.HashZero);
        expect(taskIdFlowDecrease).to.be.equal(ethers.constants.HashZero);
        expect(timestampIncrease).to.be.equal(0);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(0);
        expect(depositAmountMinimum).to.be.equal(0);
        expect(flowRate).to.be.equal(0);
        expect(superToken).to.be.equal(ethers.constants.AddressZero);

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(0);
        expect(flowRateOutput).to.be.equal(0);
        expect(deposit).to.be.equal(0);
        expect(owedDeposit).to.be.equal(0);

        const balBounty1 = await ctUSDCx.balanceOf(amBounty);
        const balClient11 = await ctUSDCx.balanceOf(client1.address);

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        var rc = await ethers.provider.getTransactionReceipt(
          rcpt.transactionHash
        );
        var block = await ethers.provider.getBlock(rc.blockNumber);
        var startTime = block.timestamp;
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "increaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(startTime + durationHold, durationHold);
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(5); // ff time

        var taskIds = await ctGelatoAutoBot.getTaskIdsByUser(amBounty);
        expect(taskIds.length).to.be.equal(2);

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIds.includes(taskIdFlowIncrease)).to.be.equal(true);
        expect(taskIds.includes(taskIdFlowDecrease)).to.be.equal(true);
        expect(timestampIncrease).to.be.equal(0);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(amount);
        expect(depositAmountMinimum).to.be.equal(amountMinimum);
        expect(flowRate).to.be.equal(flowRateOpenBounty);
        expect(superToken).to.be.equal(superToken_);

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(0);
        expect(flowRateOutput).to.be.equal(0);
        expect(deposit).to.be.equal(0);
        expect(owedDeposit).to.be.equal(0);

        const balBounty2 = await ctUSDCx.balanceOf(amBounty);
        const balClient12 = await ctUSDCx.balanceOf(client1.address);
        expect(balBounty2).to.be.equal(balBounty1.add(amount));
        expect(balClient12).to.be.equal(balClient11.sub(amount));

        await expect(
          ctGelatoAutoBot
            .connect(gelatoExecutor)
            .exec(
              amBounty,
              amBounty,
              execData,
              moduleData,
              GELATO_FEE,
              amGelatoFee,
              true,
              true
            )
        ).to.be.revertedWith("Automate.preExecCall: TimeModule: Too early");

        var tx = await ctFlowClient1.cancelBounty(0);
        var rcpt = await tx.wait();

        var taskIds = await ctGelatoAutoBot.getTaskIdsByUser(amBounty);
        expect(taskIds.length).to.be.equal(0);

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIdFlowIncrease).to.be.equal(ethers.constants.HashZero);
        expect(taskIdFlowDecrease).to.be.equal(ethers.constants.HashZero);
        expect(timestampIncrease).to.be.equal(0);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(0);
        expect(depositAmountMinimum).to.be.equal(0);
        expect(flowRate).to.be.equal(0);
        expect(superToken).to.be.equal(ethers.constants.AddressZero);

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(0);
        expect(flowRateOutput).to.be.equal(0);
        expect(deposit).to.be.equal(0);
        expect(owedDeposit).to.be.equal(0);

        const balBounty3 = await ctUSDCx.balanceOf(amBounty);
        const balClient13 = await ctUSDCx.balanceOf(client1.address);
        expect(balBounty3).to.be.equal(balBounty1);
        expect(balClient13).to.be.equal(balClient11);
      });
      it("Should stop flow and return full amount to bounty caller if cancel during flow", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctCFAV1,
          ctUSDCx,
          ctGelatoAutoBot,
          amBounty,
          gelatoExecutor,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        const balBounty1 = await ctUSDCx.balanceOf(amBounty);
        const balClient11 = await ctUSDCx.balanceOf(client1.address);

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        var rc = await ethers.provider.getTransactionReceipt(
          rcpt.transactionHash
        );
        var block = await ethers.provider.getBlock(rc.blockNumber);
        var startTime = block.timestamp;
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "increaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(startTime + durationHold, durationHold);
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(59); // ff time

        const balBounty2 = await ctUSDCx.balanceOf(amBounty);
        const balClient12 = await ctUSDCx.balanceOf(client1.address);
        expect(balBounty2).to.be.equal(balBounty1.add(amount));
        expect(balClient12).to.be.equal(balClient11.sub(amount));

        await ctGelatoAutoBot
          .connect(gelatoExecutor)
          .exec(
            amBounty,
            amBounty,
            execData,
            moduleData,
            GELATO_FEE,
            amGelatoFee,
            true,
            true
          );
        const tsStartFlow = await time.latest();

        var taskIds = await ctGelatoAutoBot.getTaskIdsByUser(amBounty);
        expect(taskIds.length).to.be.equal(1);

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIds.includes(taskIdFlowIncrease)).to.be.equal(false);
        expect(taskIds.includes(taskIdFlowDecrease)).to.be.equal(true);
        expect(timestampIncrease).to.be.equal(tsStartFlow);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(amount);
        expect(depositAmountMinimum).to.be.equal(amountMinimum);
        expect(flowRate).to.be.equal(flowRateOpenBounty);
        expect(superToken).to.be.equal(superToken_);

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(tsStartFlow);
        expect(flowRateOutput).to.be.equal(flowRateOpenBounty);
        expect(deposit).to.be.gt(flowRateOpenBounty.mul(60 * 60));
        expect(owedDeposit).to.be.equal(0);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "decreaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(
          startTime + durationHold + durationFlow,
          durationFlow
        );
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        const ffTime_ = 5;
        await time.increase(ffTime_); // ff time

        const flowAmountSoFar = flowRateOutput.mul(ffTime_);

        const balBounty_ = await ctUSDCx.balanceOf(amBounty);
        const balClient1_ = await ctUSDCx.balanceOf(client1.address);
        expect(balBounty_).to.be.equal(
          balBounty2.sub(deposit).sub(flowAmountSoFar)
        );
        expect(balClient1_).to.be.equal(balClient12.add(flowAmountSoFar));

        await expect(
          ctGelatoAutoBot
            .connect(gelatoExecutor)
            .exec(
              amBounty,
              amBounty,
              execData,
              moduleData,
              GELATO_FEE,
              amGelatoFee,
              true,
              true
            )
        ).to.be.revertedWith("Automate.preExecCall: TimeModule: Too early");

        var taskIds = await ctGelatoAutoBot.getTaskIdsByUser(amBounty);
        expect(taskIds.length).to.be.equal(1);

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIds.includes(taskIdFlowIncrease)).to.be.equal(false);
        expect(taskIds.includes(taskIdFlowDecrease)).to.be.equal(true);
        expect(timestampIncrease).to.be.equal(tsStartFlow);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(amount);
        expect(depositAmountMinimum).to.be.equal(amountMinimum);
        expect(flowRate).to.be.equal(flowRateOpenBounty);
        expect(superToken).to.be.equal(superToken_);

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(tsStartFlow);
        expect(flowRateOutput).to.be.equal(flowRateOpenBounty);
        expect(deposit).to.be.gt(flowRateOpenBounty.mul(60 * 60));
        expect(owedDeposit).to.be.equal(0);

        var tx = await ctFlowClient1.cancelBounty(0);
        var rcpt = await tx.wait();

        var taskIds = await ctGelatoAutoBot.getTaskIdsByUser(amBounty);
        expect(taskIds.length).to.be.equal(0);

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIdFlowIncrease).to.be.equal(ethers.constants.HashZero);
        expect(taskIdFlowDecrease).to.be.equal(ethers.constants.HashZero);
        expect(timestampIncrease).to.be.equal(0);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(0);
        expect(depositAmountMinimum).to.be.equal(0);
        expect(flowRate).to.be.equal(0);
        expect(superToken).to.be.equal(ethers.constants.AddressZero);

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(0);
        expect(flowRateOutput).to.be.equal(0);
        expect(deposit).to.be.equal(0);
        expect(owedDeposit).to.be.equal(0);

        const balBounty3 = await ctUSDCx.balanceOf(amBounty);
        const balClient13 = await ctUSDCx.balanceOf(client1.address);
        expect(balBounty3).to.be.equal(balBounty1);
        expect(balClient13).to.be.equal(balClient11);
      });
      it("Should return full amount to bounty caller if cancel after flow ends", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctCFAV1,
          ctUSDCx,
          ctGelatoAutoBot,
          amBounty,
          gelatoExecutor,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        const balBounty1 = await ctUSDCx.balanceOf(amBounty);
        const balClient11 = await ctUSDCx.balanceOf(client1.address);

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        var rc = await ethers.provider.getTransactionReceipt(
          rcpt.transactionHash
        );
        var block = await ethers.provider.getBlock(rc.blockNumber);
        var startTime = block.timestamp;
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "increaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(startTime + durationHold, durationHold);
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(59); // ff time

        const balBounty2 = await ctUSDCx.balanceOf(amBounty);
        const balClient12 = await ctUSDCx.balanceOf(client1.address);
        expect(balBounty2).to.be.equal(balBounty1.add(amount));
        expect(balClient12).to.be.equal(balClient11.sub(amount));

        await ctGelatoAutoBot
          .connect(gelatoExecutor)
          .exec(
            amBounty,
            amBounty,
            execData,
            moduleData,
            GELATO_FEE,
            amGelatoFee,
            true,
            true
          );
        const tsStartFlow = await time.latest();

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "decreaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(
          startTime + durationHold + durationFlow,
          durationFlow
        );
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(56); // ff time

        await ctGelatoAutoBot
          .connect(gelatoExecutor)
          .exec(
            amBounty,
            amBounty,
            execData,
            moduleData,
            GELATO_FEE,
            amGelatoFee,
            true,
            true
          );
        const tsStopFlow = await time.latest();

        var taskIds = await ctGelatoAutoBot.getTaskIdsByUser(amBounty);
        expect(taskIds.length).to.be.equal(0);

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIds.includes(taskIdFlowIncrease)).to.be.equal(false);
        expect(taskIds.includes(taskIdFlowDecrease)).to.be.equal(false);
        expect(timestampIncrease).to.be.equal(tsStartFlow);
        expect(timestampDecrease).to.be.equal(tsStopFlow);
        expect(depositAmount).to.be.equal(amount);
        expect(depositAmountMinimum).to.be.equal(amountMinimum);
        expect(flowRate).to.be.equal(flowRateOpenBounty);
        expect(superToken).to.be.equal(superToken_);

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(0);
        expect(flowRateOutput).to.be.equal(0);
        expect(deposit).to.be.equal(0);
        expect(owedDeposit).to.be.equal(0);

        const flowAmountSoFar = flowRateOpenBounty.mul(
          tsStopFlow - tsStartFlow
        );

        const balBounty_ = await ctUSDCx.balanceOf(amBounty);
        const balClient1_ = await ctUSDCx.balanceOf(client1.address);
        expect(balBounty_).to.be.equal(balBounty2.sub(flowAmountSoFar));
        expect(balClient1_).to.be.equal(balClient12.add(flowAmountSoFar));

        var tx = await ctFlowClient1.cancelBounty(0);
        var rcpt = await tx.wait();

        var {
          taskIdFlowIncrease,
          taskIdFlowDecrease,
          timestampIncrease,
          timestampDecrease,
          depositAmount,
          depositAmountMinimum,
          flowRate,
          superToken,
        } = await ctFlowClient1.getBounty(client1.address, 0);
        expect(taskIdFlowIncrease).to.be.equal(ethers.constants.HashZero);
        expect(taskIdFlowDecrease).to.be.equal(ethers.constants.HashZero);
        expect(timestampIncrease).to.be.equal(0);
        expect(timestampDecrease).to.be.equal(0);
        expect(depositAmount).to.be.equal(0);
        expect(depositAmountMinimum).to.be.equal(0);
        expect(flowRate).to.be.equal(0);
        expect(superToken).to.be.equal(ethers.constants.AddressZero);

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(0);
        expect(flowRateOutput).to.be.equal(0);
        expect(deposit).to.be.equal(0);
        expect(owedDeposit).to.be.equal(0);

        const balBounty3 = await ctUSDCx.balanceOf(amBounty);
        const balClient13 = await ctUSDCx.balanceOf(client1.address);
        expect(balBounty3).to.be.equal(balBounty1);
        expect(balClient13).to.be.equal(balClient11);
      });
    });
    describe("awardBounty", async () => {
      it("Should award full amount to bounty winner if award before flow starts", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctCFAV1,
          ctUSDCx,
          ctGelatoAutoBot,
          amBounty,
          gelatoExecutor,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        const balBounty1 = await ctUSDCx.balanceOf(amBounty);
        const balClient11 = await ctUSDCx.balanceOf(client1.address);
        const balWorker11 = await ctUSDCx.balanceOf(worker1.address);

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        var rc = await ethers.provider.getTransactionReceipt(
          rcpt.transactionHash
        );
        var block = await ethers.provider.getBlock(rc.blockNumber);
        var startTime = block.timestamp;
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "increaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(startTime + durationHold, durationHold);
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(5); // ff time

        const balBounty2 = await ctUSDCx.balanceOf(amBounty);
        const balClient12 = await ctUSDCx.balanceOf(client1.address);
        const balWorker12 = await ctUSDCx.balanceOf(worker1.address);
        expect(balBounty2).to.be.equal(balBounty1.add(amount));
        expect(balClient12).to.be.equal(balClient11.sub(amount));
        expect(balWorker12).to.be.equal(balWorker11);

        await expect(
          ctGelatoAutoBot
            .connect(gelatoExecutor)
            .exec(
              amBounty,
              amBounty,
              execData,
              moduleData,
              GELATO_FEE,
              amGelatoFee,
              true,
              true
            )
        ).to.be.revertedWith("Automate.preExecCall: TimeModule: Too early");

        var tx = await ctFlowClient1.awardBounty(0, worker1.address);
        var rcpt = await tx.wait();

        var taskIds = await ctGelatoAutoBot.getTaskIdsByUser(amBounty);
        expect(taskIds.length).to.be.equal(0);

        const balBounty3 = await ctUSDCx.balanceOf(amBounty);
        const balClient13 = await ctUSDCx.balanceOf(client1.address);
        const balWorker13 = await ctUSDCx.balanceOf(worker1.address);
        expect(balBounty3).to.be.equal(balBounty1);
        expect(balClient13).to.be.equal(balClient11.sub(amount));
        expect(balWorker13).to.be.equal(balWorker11.add(amount));
      });
      it("Should stop flow and award remaining amount to bounty winner if award during flow", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctCFAV1,
          ctUSDCx,
          ctGelatoAutoBot,
          amBounty,
          gelatoExecutor,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        const balBounty1 = await ctUSDCx.balanceOf(amBounty);
        const balClient11 = await ctUSDCx.balanceOf(client1.address);
        const balWorker11 = await ctUSDCx.balanceOf(worker1.address);

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        var rc = await ethers.provider.getTransactionReceipt(
          rcpt.transactionHash
        );
        var block = await ethers.provider.getBlock(rc.blockNumber);
        var startTime = block.timestamp;
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "increaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(startTime + durationHold, durationHold);
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(59); // ff time

        const balBounty2 = await ctUSDCx.balanceOf(amBounty);
        const balClient12 = await ctUSDCx.balanceOf(client1.address);
        const balWorker12 = await ctUSDCx.balanceOf(worker1.address);
        expect(balBounty2).to.be.equal(balBounty1.add(amount));
        expect(balClient12).to.be.equal(balClient11.sub(amount));
        expect(balWorker12).to.be.equal(balWorker11);

        await ctGelatoAutoBot
          .connect(gelatoExecutor)
          .exec(
            amBounty,
            amBounty,
            execData,
            moduleData,
            GELATO_FEE,
            amGelatoFee,
            true,
            true
          );
        const tsStartFlow = await time.latest();

        var {
          timestamp,
          flowRate: flowRateOutput,
          deposit,
          owedDeposit,
        } = await ctCFAV1.getFlow(superToken_, amBounty, client1.address);
        expect(timestamp).to.be.equal(tsStartFlow);
        expect(flowRateOutput).to.be.equal(flowRateOpenBounty);
        expect(deposit).to.be.gt(flowRateOpenBounty.mul(60 * 60));
        expect(owedDeposit).to.be.equal(0);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "decreaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(
          startTime + durationHold + durationFlow,
          durationFlow
        );
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        const ffTime_ = 5;
        await time.increase(ffTime_); // ff time

        var flowAmountSoFar = flowRateOutput.mul(ffTime_);

        const balBounty_ = await ctUSDCx.balanceOf(amBounty);
        const balClient1_ = await ctUSDCx.balanceOf(client1.address);
        const balWorker1_ = await ctUSDCx.balanceOf(worker1.address);
        expect(balBounty_).to.be.equal(
          balBounty2.sub(deposit).sub(flowAmountSoFar)
        );
        expect(balClient1_).to.be.equal(balClient12.add(flowAmountSoFar));
        expect(balWorker1_).to.be.equal(balWorker11);

        await expect(
          ctGelatoAutoBot
            .connect(gelatoExecutor)
            .exec(
              amBounty,
              amBounty,
              execData,
              moduleData,
              GELATO_FEE,
              amGelatoFee,
              true,
              true
            )
        ).to.be.revertedWith("Automate.preExecCall: TimeModule: Too early");

        var tx = await ctFlowClient1.awardBounty(0, worker1.address);
        var rcpt = await tx.wait();

        var flowAmountSoFar = flowRateOutput.mul(ffTime_ + 1);

        const balBounty3 = await ctUSDCx.balanceOf(amBounty);
        const balClient13 = await ctUSDCx.balanceOf(client1.address);
        const balWorker13 = await ctUSDCx.balanceOf(worker1.address);
        expect(balBounty3).to.be.equal(balBounty1);
        expect(balClient13).to.be.equal(balClient12.add(flowAmountSoFar));
        expect(balWorker13).to.be.equal(
          balWorker11.add(amount.sub(flowAmountSoFar))
        );
      });
      it("Should award minimum amount to bounty winner if award after flow ends", async () => {
        const result = await loadFixture(init);
        if (!result) {
          expect(true).to.be.equal(false);
          return;
        }
        const {
          chainId,
          ctFlowClient1,
          ctCFAV1,
          ctUSDCx,
          ctGelatoAutoBot,
          amBounty,
          gelatoExecutor,
          client1,
          worker1,
        } = result;

        await fundBountyContractGelatoTresury(
          chainId,
          amBounty,
          ethers.utils.parseEther("0.501")
        );

        const amountST = ethers.utils.parseEther("500");
        await approveDepositClientSTFundsToContract(
          client1,
          amBounty,
          amountST,
          chainId
        );
        await prefundSTToBountyContract(amBounty, amountST, chainId);

        const superToken_ = networkConfig[chainId]["addrUSDCx"];
        const amount = ethers.utils.parseEther("3");
        const amountMinimum = ethers.utils.parseEther("1");
        const durationHold = 60;
        const durationFlow = 60;

        const balBounty1 = await ctUSDCx.balanceOf(amBounty);
        const balClient11 = await ctUSDCx.balanceOf(client1.address);
        const balWorker11 = await ctUSDCx.balanceOf(worker1.address);

        var tx = await ctFlowClient1.openBounty(
          superToken_,
          amount,
          amountMinimum,
          durationHold,
          durationFlow
        );
        var rcpt = await tx.wait();
        var rc = await ethers.provider.getTransactionReceipt(
          rcpt.transactionHash
        );
        var block = await ethers.provider.getBlock(rc.blockNumber);
        var startTime = block.timestamp;
        const flowRateOpenBounty = amount.sub(amountMinimum).div(durationFlow);

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "increaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(startTime + durationHold, durationHold);
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(59); // ff time

        const balBounty2 = await ctUSDCx.balanceOf(amBounty);
        const balClient12 = await ctUSDCx.balanceOf(client1.address);
        const balWorker12 = await ctUSDCx.balanceOf(worker1.address);
        expect(balBounty2).to.be.equal(balBounty1.add(amount));
        expect(balClient12).to.be.equal(balClient11.sub(amount));
        expect(balWorker12).to.be.equal(balWorker11);

        await ctGelatoAutoBot
          .connect(gelatoExecutor)
          .exec(
            amBounty,
            amBounty,
            execData,
            moduleData,
            GELATO_FEE,
            amGelatoFee,
            true,
            true
          );
        const tsStartFlow = await time.latest();

        var execData = ctFlowClient1.interface.encodeFunctionData(
          "decreaseFlow",
          [superToken_, client1.address, flowRateOpenBounty, 0]
        );
        var timeArgs = encodeTimeArgs(
          startTime + durationHold + durationFlow,
          durationFlow
        );
        var moduleData = {
          modules: [1, 3],
          args: [timeArgs],
        };

        await time.increase(56); // ff time

        await ctGelatoAutoBot
          .connect(gelatoExecutor)
          .exec(
            amBounty,
            amBounty,
            execData,
            moduleData,
            GELATO_FEE,
            amGelatoFee,
            true,
            true
          );
        const tsStopFlow = await time.latest();

        const flowAmountSoFar = flowRateOpenBounty.mul(
          tsStopFlow - tsStartFlow
        );

        const balBounty_ = await ctUSDCx.balanceOf(amBounty);
        const balClient1_ = await ctUSDCx.balanceOf(client1.address);
        const balWorker1_ = await ctUSDCx.balanceOf(worker1.address);
        expect(balBounty_).to.be.equal(balBounty2.sub(flowAmountSoFar));
        expect(balClient1_).to.be.equal(balClient12.add(flowAmountSoFar));
        expect(balWorker1_).to.be.equal(balWorker11);

        var tx = await ctFlowClient1.awardBounty(0, worker1.address);
        var rcpt = await tx.wait();

        const balBounty3 = await ctUSDCx.balanceOf(amBounty);
        const balClient13 = await ctUSDCx.balanceOf(client1.address);
        const balWorker13 = await ctUSDCx.balanceOf(worker1.address);
        expect(balBounty3).to.be.equal(balBounty1);
        expect(balClient13).to.be.equal(balClient12.add(flowAmountSoFar));
        expect(balWorker13).to.be.equal(
          balWorker11.add(amount.sub(flowAmountSoFar))
        );
      });
    });
  });
});

// REPORT_GAS=true npx hardhat test ./test/Bounty.ts
